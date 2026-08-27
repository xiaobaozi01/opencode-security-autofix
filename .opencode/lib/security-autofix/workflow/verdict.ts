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
  return String(finding.verdict ?? finding.fixability ?? "").trim().toUpperCase()
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

export function validateFinalFinding(
  finding: AnyRecord,
  index: number,
  workflowMode = "AUTOFIX",
): string[] {
  const label = String(finding.id ?? `Finding-${index + 1}`)
  const errors: string[] = []
  const verdict = finalStatus(finding)
  const analysis = analysisVerdict(finding)
  const route = String(finding.route?.status ?? "").trim().toUpperCase()
  const gates = gateStatuses(finding)
  const values = Object.values(gates)
  const hasFailure = values.some(value => FAILURE.has(value))
  const allPassed = REQUIRED_ACCEPTANCE_GATES.every(name =>
    name === "rescan" ? gates[name] === "ABSENT" : gates[name] === "PASS",
  )
  const patchState = patchBatchStatus(finding)
  const verifiesExistingPatch = workflowMode.toUpperCase() === "VERIFY" && patchState === "EXISTING"

  if (analysis === "NOT_VULNERABLE" && verdict !== "FALSE_POSITIVE") {
    errors.push(`${label}: analysis_verdict=NOT_VULNERABLE 时最终结论必须是 FALSE_POSITIVE`)
  }
  if (["PARTIAL", "NEED_CONTEXT"].includes(analysis) && verdict !== "HUMAN_REVIEW") {
    errors.push(`${label}: analysis_verdict=${analysis} 时最终结论必须是 HUMAN_REVIEW`)
  }
  if (verdict === "FALSE_POSITIVE" && analysis !== "NOT_VULNERABLE") {
    errors.push(`${label}: FALSE_POSITIVE 必须有 NOT_VULNERABLE 分析结论`)
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
  const workflowMode = String(report.task?.mode ?? "AUTOFIX")
  return report.findings.flatMap((finding: unknown, index: number) =>
    validateFinalFinding(
      finding && typeof finding === "object" ? finding as AnyRecord : {},
      index,
      workflowMode,
    ),
  )
}
