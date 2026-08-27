import { tool } from "@opencode-ai/plugin"
import path from "path"
import { mkdir, writeFile } from "fs/promises"
import { loadSecurityAutofixConfig } from "../config"

type AnyRecord = Record<string, any>

function isAlreadyExists(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "EEXIST")
}

async function writeUniqueTextFile(directory: string, filename: string, content: string) {
  const extension = path.extname(filename)
  const stem = filename.slice(0, filename.length - extension.length)

  for (let index = 0; index < 1000; index++) {
    const suffix = index === 0 ? "" : `-${String(index).padStart(2, "0")}`
    const candidate = path.join(directory, `${stem}${suffix}${extension}`)
    try {
      await writeFile(candidate, content, { encoding: "utf8", flag: "wx" })
      return candidate
    } catch (error) {
      if (!isAlreadyExists(error)) throw error
    }
  }

  throw new Error("同一时间戳下的 Security AutoFix 报告数量超过限制")
}

function text(value: unknown, fallback = "-"): string {
  if (value === undefined || value === null || value === "") {
    return fallback
  }

  if (Array.isArray(value)) {
    return value.map(v => text(v, "")).filter(Boolean).join("、") || fallback
  }

  if (typeof value === "object") {
    return JSON.stringify(value)
  }

  return String(value)
}

function mdCell(value: unknown): string {
  return text(value).replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>")
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : []
}

function sectionList(title: string, values: unknown): string {
  const items = asArray(values).filter(
    v => v !== undefined && v !== null && String(v).trim() !== "",
  )

  if (!items.length) {
    return `### ${title}\n\n- 无\n`
  }

  return `### ${title}\n\n${items.map(v => `- ${text(v)}`).join("\n")}\n`
}

function gateStatus(value: any): { status: string; detail: string } {
  if (typeof value === "string") {
    return { status: value, detail: "-" }
  }

  if (value && typeof value === "object") {
    return {
      status: text(value.status ?? value.result ?? value.verdict),
      detail: text(value.reason ?? value.detail ?? value.message),
    }
  }

  return { status: text(value), detail: "-" }
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

/**
 * Markdown 正文时间。
 * 示例：2026-08-19 18:03:26
 * 使用运行 OpenCode 的机器本地时间。
 */
function formatLocalDateTime(date: Date): string {
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    " " +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds())
  )
}

/**
 * Markdown 文件名时间。
 * 示例：2026-08-19 18-03-26
 * Windows 文件名不能包含冒号，因此时分秒使用 "-" 分隔。
 */
function formatFilenameDateTime(date: Date): string {
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    " " +
    pad(date.getHours()) +
    "-" +
    pad(date.getMinutes()) +
    "-" +
    pad(date.getSeconds())
  )
}

function renderFinding(finding: AnyRecord, index: number): string {
  const id = text(finding.id, `Finding-${index + 1}`)
  const route =
    finding.route && typeof finding.route === "object"
      ? finding.route
      : {}
  const displayType = text(
    route.display_type ?? route.candidates?.[0]?.display_type,
    "UNCLASSIFIED",
  )
  const cwes = asArray(finding.taxonomies)
    .filter(item => String(item?.name ?? "").toUpperCase() === "CWE")
    .map(item => item.id)
  const gates = finding.gates && typeof finding.gates === "object" ? finding.gates : {}

  const gateRows = Object.entries(gates).map(([name, value]) => {
    const gate = gateStatus(value)
    return `| ${mdCell(name)} | ${mdCell(gate.status)} | ${mdCell(gate.detail)} |`
  })

  const files = asArray(finding.files)
  const evidence = asArray(finding.evidence)
  const notRun = asArray(finding.notRun ?? finding.not_run)
  const remainingRisk = asArray(finding.remainingRisk ?? finding.remaining_risk)
  const humanChecks = asArray(finding.humanChecks ?? finding.human_checks)

  return [
    `## ${index + 1}. ${id} - ${displayType}`,
    "",
    `- **Repair Route**：${text(route.status, "UNCLASSIFIED")}`,
    `- **Repair Entry**：${text(route.repair_entry_id)}`,
    `- **CWE**：${text(cwes)}`,
    `- **严重级别**：${text(finding.severity)}`,
    `- **最终结论**：${text(finding.verdict ?? finding.fixability)}`,
    `- **Repair Provider**：${text(finding.repairProvider ?? finding.repair_provider)}`,
    `- **Repair Strategy**：${text(finding.strategy)}`,
    "",
    "### 根因",
    "",
    text(finding.rootCause ?? finding.root_cause, "未提供"),
    "",
    "### 修复策略",
    "",
    text(finding.strategy, "未提供"),
    "",
    "### 修改文件",
    "",
    files.length ? files.map(v => `- \`${text(v)}\``).join("\n") : "- 无代码修改",
    "",
    "### Patch 摘要",
    "",
    text(finding.patchSummary ?? finding.patch_summary, "无"),
    "",
    "### 验证门禁",
    "",
    gateRows.length
      ? ["| Gate | 状态 | 说明 |", "|---|---|---|", ...gateRows].join("\n")
      : "未提供门禁数据。",
    "",
    sectionList("验证证据", evidence).trimEnd(),
    "",
    sectionList("未执行验证", notRun).trimEnd(),
    "",
    sectionList("剩余风险", remainingRisk).trimEnd(),
    "",
    sectionList("人工检查项", humanChecks).trimEnd(),
    "",
  ].join("\n")
}

function buildMarkdown(report: AnyRecord, generatedAt: string): string {
  const findings = asArray(report.findings)
  const count = (value: string) =>
    findings.filter(
      f => String(f?.verdict ?? f?.fixability ?? "").toUpperCase() === value,
    ).length

  const accepted = count("FIX_ACCEPTED")
  const rejected = count("FIX_REJECTED")
  const humanReview = count("HUMAN_REVIEW")
  const guidanceOnly = count("GUIDANCE_ONLY")
  const notSupported = count("NOT_SUPPORTED")
  const falsePositive = count("FALSE_POSITIVE")
  const task = report.task && typeof report.task === "object" ? report.task : {}

  const parts = [
    "# Security AutoFix 修复报告",
    "",
    `- **任务名称**：${text(task.name, "Security AutoFix")}`,
    `- **输入来源**：${text(task.source)}`,
    `- **报告生成时间**：${generatedAt}`,
    "",
    "## 执行摘要",
    "",
    "| 指标 | 数量 |",
    "|---|---:|",
    `| Finding 总数 | ${findings.length} |`,
    `| 修复接受 FIX_ACCEPTED | ${accepted} |`,
    `| 修复拒绝 FIX_REJECTED | ${rejected} |`,
    `| 人工审核 HUMAN_REVIEW | ${humanReview} |`,
    `| 仅提供建议 GUIDANCE_ONLY | ${guidanceOnly} |`,
    `| 暂不支持 NOT_SUPPORTED | ${notSupported} |`,
    `| 误报 FALSE_POSITIVE | ${falsePositive} |`,
    "",
    "## Finding 明细",
    "",
  ]

  if (!findings.length) {
    parts.push("本次任务没有可报告的 Finding。", "")
  } else {
    findings.forEach((finding, index) => {
      parts.push(renderFinding(finding ?? {}, index))
    })
  }

  parts.push(
    "## 说明",
    "",
    "- 本报告由 Security AutoFix 根据实际分析、补丁和验证证据生成。",
    "- `NOT_RUN` 表示对应验证未执行，不代表通过。",
    "- 最终安全裁决来自 `final-judge` 或前序可修复性分类；报告生成层不会改变裁决。",
    "",
  )

  return parts.join("\n")
}

export const autofixResultTool = tool({
  description:
    "将 Security AutoFix 的结构化最终结果写入一份 Markdown 总报告。报告文件名由 Tool 强制按本地年月日时分秒生成，不接受调用方指定文件名。",

  args: {
    result_json: tool.schema.string().describe("完整的 Security AutoFix 最终结果 JSON 字符串"),
  },

  async execute(args, context) {
    let report: AnyRecord

    try {
      report = JSON.parse(args.result_json)
    } catch (error) {
      return JSON.stringify({
        status: "FAILED",
        reason: `result_json 不是合法 JSON：${
          error instanceof Error ? error.message : String(error)
        }`,
      })
    }

    if (!Array.isArray(report.findings)) {
      return JSON.stringify({
        status: "FAILED",
        reason: "result_json.findings 必须是数组",
      })
    }

    const root = path.resolve(context.worktree)
    const { config } = await loadSecurityAutofixConfig(root)

    let outputDir = "security-autofix-results"
    let writeJsonSidecar = false

    if (typeof config.results?.outputDir === "string" && config.results.outputDir.trim()) {
      outputDir = config.results.outputDir.trim()
    }
    writeJsonSidecar = config.results?.writeJsonSidecar === true

    if (path.isAbsolute(outputDir) || outputDir.split(/[\\/]+/).includes("..")) {
      return JSON.stringify({
        status: "FAILED",
        reason: "results.outputDir 必须是项目内的安全相对路径",
      })
    }

    const dir = path.resolve(root, outputDir)
    const relativeDir = path.relative(root, dir)

    if (relativeDir.startsWith("..") || path.isAbsolute(relativeDir)) {
      return JSON.stringify({
        status: "FAILED",
        reason: "结果目录不能位于项目工作区之外",
      })
    }

    await mkdir(dir, { recursive: true })

    // 文件名和正文共用同一个本地时间对象，保证时间完全一致。
    const now = new Date()
    const generatedAt = formatLocalDateTime(now)
    const filenameStamp = formatFilenameDateTime(now)
    const filename = `security-autofix-result-${filenameStamp}.md`

    const markdown = buildMarkdown(report, generatedAt)
    const reportPath = await writeUniqueTextFile(dir, filename, markdown)

    let jsonPath: string | undefined

    if (writeJsonSidecar) {
      jsonPath = reportPath.replace(/\.md$/i, ".json")
      await writeFile(
        jsonPath,
        JSON.stringify({ ...report, generated_at: generatedAt }, null, 2),
        "utf8",
      )
    }

    return JSON.stringify({
      status: "WRITTEN",
      reportPath: path.relative(root, reportPath).replace(/\\/g, "/"),
      jsonPath: jsonPath ? path.relative(root, jsonPath).replace(/\\/g, "/") : undefined,
      findingCount: report.findings.length,
      generatedAt,
    })
  },
})
