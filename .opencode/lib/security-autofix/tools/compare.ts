import { tool } from "@opencode-ai/plugin"
import path from "node:path"
import { compareBaselineAndRescan } from "../finding/compare"
import type { FindingIdentityInput } from "../finding/identity"
import { loadReport } from "../report/load"

function publicComparison(value: ReturnType<typeof compareBaselineAndRescan>) {
  const locate = (item: typeof value.baseline | undefined) => item ? {
    status: item.status,
    reason: item.reason,
    identity_strength: item.identityStrength,
    finding_key: item.findingKey,
    match_count: item.matchCount,
  } : undefined
  return {
    status: value.status,
    reason: value.reason,
    finding_key: value.baseline.findingKey,
    identity_strength: value.baseline.identityStrength,
    baseline: locate(value.baseline),
    rescan: locate(value.rescan),
  }
}

export const autofixCompareTool = tool({
  description:
    "使用稳定 Finding 身份确定性比较修复前基线报告和修复后重扫报告。只有 Fingerprint 可证明 ABSENT；弱身份缺失返回 INDETERMINATE。",
  args: {
    original_json: tool.schema.string().describe("原 StandardVulnerability JSON 字符串"),
    baseline_file: tool.schema.string().describe("修复前基线扫描报告的项目内路径"),
    rescan_file: tool.schema.string().optional().describe("修复后重扫报告的项目内路径；省略时只验证基线"),
    baseline_adapter: tool.schema.string().default("auto"),
    rescan_adapter: tool.schema.string().default("auto"),
  },
  async execute(args, context) {
    let original: FindingIdentityInput
    try {
      original = JSON.parse(args.original_json)
    } catch (error) {
      return JSON.stringify({
        status: "INDETERMINATE",
        reason: `original_json 不是合法 JSON：${error instanceof Error ? error.message : String(error)}`,
      })
    }

    const root = path.resolve(context.worktree)
    const baseline = await loadReport(root, args.baseline_file, "auto", args.baseline_adapter)
    const rescan = args.rescan_file
      ? await loadReport(root, args.rescan_file, "auto", args.rescan_adapter)
      : undefined
    return JSON.stringify(publicComparison(
      compareBaselineAndRescan(original, baseline.findings, rescan?.findings),
    ))
  },
})
