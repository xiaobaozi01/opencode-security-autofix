type AnyRecord = Record<string, any>

export const REQUIRED_ACCEPTANCE_GATES = [
  "analysis",
  "patch",
  "security_review",
  "build",
  "tests",
  "rescan",
  "regression_review",
] as const

function status(value: unknown) {
  if (typeof value === "string") return value.trim().toUpperCase()
  if (value && typeof value === "object") {
    const record = value as AnyRecord
    return String(record.status ?? record.result ?? record.verdict ?? "").trim().toUpperCase()
  }
  return ""
}

function finalStatus(finding: AnyRecord) {
  return String(finding.verdict ?? "").trim().toUpperCase()
}

function analysisVerdict(finding: AnyRecord) {
  return String(finding.analysis_verdict ?? finding.analysisVerdict ?? "").trim().toUpperCase()
}

function patchBatchStatus(finding: AnyRecord) {
  return status(finding.patch_batch ?? finding.patchBatch)
}

function gateStatuses(finding: AnyRecord) {
  const gates = finding.gates && typeof finding.gates === "object" ? finding.gates : {}
  return Object.fromEntries(REQUIRED_ACCEPTANCE_GATES.map(name => [name, status(gates[name])]))
}

const FAILURE = new Set(["FAIL", "FAILED", "PRESENT", "REJECTED"])
const VERDICTS = new Set([
  "FIX_ACCEPTED",
  "FIX_REJECTED",
  "HUMAN_REVIEW",
  "FALSE_POSITIVE",
  "GUIDANCE_ONLY",
  "NOT_SUPPORTED",
])
const ANALYSIS_VERDICTS = new Set(["VULNERABLE", "NOT_VULNERABLE", "PARTIAL", "NEED_CONTEXT"])
const CONFIDENCES = new Set(["HIGH", "MEDIUM", "LOW", "UNKNOWN"])
const GATE_STATUSES = new Set([
  "PASS", "FAIL", "FAILED", "PRESENT", "ABSENT", "REJECTED", "NOT_RUN", "INDETERMINATE",
  "WARN", "UNKNOWN",
])

export function validateFinalFinding(
  finding: AnyRecord,
  index: number,
  workflowMode = "AUTOFIX",
): string[] {
  const label = String(finding.id ?? `Finding-${index + 1}`)
  const errors: string[] = []
  const verdict = finalStatus(finding)
  const analysis = analysisVerdict(finding)
  const confidence = String(finding.analysis_confidence ?? "").trim().toUpperCase()
  const route = String(finding.route?.status ?? "").trim().toUpperCase()
  const gates = gateStatuses(finding)
  const values = Object.values(gates)
  const hasFailure = values.some(value => FAILURE.has(value))
  const allPassed = REQUIRED_ACCEPTANCE_GATES.every(name =>
    name === "rescan" ? gates[name] === "ABSENT" : gates[name] === "PASS",
  )
  const patchState = patchBatchStatus(finding)
  const verifiesExistingPatch = workflowMode.toUpperCase() === "VERIFY" && patchState === "EXISTING"

  if (!VERDICTS.has(verdict)) {
    errors.push(`${label}: verdict 必须是受支持的最终结论，当前为 ${verdict || "缺失"}`)
  }
  if (!ANALYSIS_VERDICTS.has(analysis)) {
    errors.push(`${label}: analysis_verdict 不受支持：${analysis}`)
  }
  if (!CONFIDENCES.has(confidence)) {
    errors.push(`${label}: analysis_confidence 不受支持：${confidence || "缺失"}`)
  }
  for (const [name, gateStatus] of Object.entries(gates)) {
    if (gateStatus && !GATE_STATUSES.has(gateStatus)) {
      errors.push(`${label}: Gate ${name} 的状态不受支持：${gateStatus}`)
    }
  }

  if (analysis === "NOT_VULNERABLE" && verdict !== "FALSE_POSITIVE") {
    errors.push(`${label}: analysis_verdict=NOT_VULNERABLE 时最终结论必须是 FALSE_POSITIVE`)
  }
  if (["VULNERABLE", "NOT_VULNERABLE"].includes(analysis) && confidence !== "HIGH" &&
      ["FIX_ACCEPTED", "FALSE_POSITIVE"].includes(verdict)) {
    errors.push(`${label}: ${verdict} 要求 analysis_confidence=HIGH`)
  }
  if (["PARTIAL", "NEED_CONTEXT"].includes(analysis) && verdict !== "HUMAN_REVIEW") {
    errors.push(`${label}: analysis_verdict=${analysis} 时最终结论必须是 HUMAN_REVIEW`)
  }
  if (verdict === "FALSE_POSITIVE" && analysis !== "NOT_VULNERABLE") {
    errors.push(`${label}: FALSE_POSITIVE 必须有 NOT_VULNERABLE 分析结论`)
  }
  if (route === "FALSE_POSITIVE" && verdict !== "FALSE_POSITIVE") {
    errors.push(`${label}: route.status=FALSE_POSITIVE 时最终结论必须是 FALSE_POSITIVE`)
  }
  if (verdict === "NOT_SUPPORTED" && route !== "NOT_SUPPORTED") {
    errors.push(`${label}: NOT_SUPPORTED 必须有同名 Repair Route`)
  }
  if (verdict === "GUIDANCE_ONLY" && route !== "UNCLASSIFIED") {
    errors.push(`${label}: GUIDANCE_ONLY 必须有 UNCLASSIFIED Repair Route`)
  }

  if (hasFailure && verdict !== "FIX_REJECTED") {
    errors.push(`${label}: 必要 Gate 存在失败或原漏洞仍 PRESENT，最终结论必须是 FIX_REJECTED`)
  }

  if (verdict === "FIX_ACCEPTED") {
    if (analysis !== "VULNERABLE") errors.push(`${label}: FIX_ACCEPTED 必须有 VULNERABLE 分析结论`)
    if (route !== "MATCHED") errors.push(`${label}: FIX_ACCEPTED 必须有 MATCHED Repair Route`)
    if (!allPassed) {
      errors.push(`${label}: FIX_ACCEPTED 要求所有必要 Gate PASS 且 rescan=ABSENT`)
    }
    if (patchState !== "ACCEPTED" && !verifiesExistingPatch) {
      errors.push(`${label}: FIX_ACCEPTED 必须有 patch_batch.status=ACCEPTED`)
    }
    if (workflowMode.toUpperCase() === "VERIFY" &&
        !String(finding.verification_baseline ?? finding.baseline_reference ?? "").trim()) {
      errors.push(`${label}: VERIFY 的 FIX_ACCEPTED 必须引用独立的历史 baseline`)
    }
    if (!String(finding.rescan_comparison_id ?? finding.comparison_id ?? "").trim()) {
      errors.push(`${label}: FIX_ACCEPTED 必须引用 autofix_compare 生成的 Comparison Receipt`)
    }
  }

  if (verdict === "FIX_REJECTED") {
    if (!hasFailure) errors.push(`${label}: FIX_REJECTED 必须有明确失败 Gate 或 rescan=PRESENT`)
    if (gates.patch === "PASS" && !verifiesExistingPatch && !["ROLLED_BACK", "CONFLICT"].includes(patchState)) {
      errors.push(`${label}: 被拒绝的已应用 Patch 必须回滚或明确报告 CONFLICT`)
    }
  }

  if (verdict === "HUMAN_REVIEW" && gates.patch === "PASS" && !verifiesExistingPatch &&
      !["ROLLED_BACK", "CONFLICT"].includes(patchState)) {
    errors.push(`${label}: 未被接受的 Patch 必须回滚或明确报告 CONFLICT`)
  }

  if (["FALSE_POSITIVE", "GUIDANCE_ONLY", "NOT_SUPPORTED"].includes(verdict) &&
      (gates.patch === "PASS" || ["OPEN", "SEALED", "ACCEPTED"].includes(patchState))) {
    errors.push(`${label}: ${verdict} 不得保留已应用或未结束的 Patch Batch`)
  }

  if (["FIX_ACCEPTED", "FIX_REJECTED"].includes(verdict) && !analysis) {
    errors.push(`${label}: 缺少 analysis_verdict`)
  }
  if (verdict === "FIX_ACCEPTED" && !allPassed) {
    const missing = REQUIRED_ACCEPTANCE_GATES.filter(name => !gates[name])
    if (missing.length) errors.push(`${label}: 缺少必要 Gate：${missing.join(", ")}`)
  }

  return [...new Set(errors)]
}

export function validateFinalReport(report: AnyRecord): string[] {
  if (!Array.isArray(report.findings)) return ["result_json.findings 必须是数组"]
  const workflowMode = String(report.task?.mode ?? "").trim().toUpperCase()
  const reportErrors = ["AUTOFIX", "VERIFY"].includes(workflowMode)
    ? []
    : ["result_json.task.mode 必须明确为 AUTOFIX 或 VERIFY"]
  return reportErrors.concat(report.findings.flatMap((finding: unknown, index: number) =>
    validateFinalFinding(
      finding && typeof finding === "object" ? finding as AnyRecord : {},
      index,
      workflowMode,
    ),
  ))
}
