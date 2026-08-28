import { tool } from "@opencode-ai/plugin"
import path from "path"
import { loadSecurityAutofixConfig } from "../config"
import { resolveScannerAdapter } from "../scanner/registry"
import type { ScanRequest, ScannerAdapterConfig } from "../scanner/types"

export const autofixScanTool = tool({
  description:
    "统一安全重扫入口：通过 Scanner Adapter Registry 调用配置的扫描器。扫描执行成功不等于漏洞已经修复。",
  args: {
    mode: tool.schema.enum(["targeted", "full"]),
    repairEntryId: tool.schema.string().optional().describe("Repair Route 选定的 Repair Entry ID"),
    ruleId: tool.schema.string().optional().describe("原扫描器 Rule ID"),
    findingId: tool.schema.string().optional().describe("原扫描器 Finding ID"),
  },
  async execute(args, context) {
    const root = path.resolve(context.worktree)
    const loaded = await loadSecurityAutofixConfig(root)
    const scanner = loaded.config.scanner as ScannerAdapterConfig | undefined

    if (!scanner?.adapter) {
      return JSON.stringify({
        status: "NOT_RUN",
        scanner: "unconfigured",
        adapter: "unconfigured",
        reason: "缺少 .opencode/security-autofix.json 中的 scanner.adapter 配置",
      })
    }

    const adapter = resolveScannerAdapter(scanner.adapter)
    const request: ScanRequest = {
      mode: args.mode,
      repairEntryId: args.repairEntryId,
      ruleId: args.ruleId,
      findingId: args.findingId,
    }

    return JSON.stringify(
      await adapter.scan(scanner, request, {
        worktreeRoot: root,
        configPath: loaded.path,
        abortSignal: context.abort,
      }),
    )
  },
})
