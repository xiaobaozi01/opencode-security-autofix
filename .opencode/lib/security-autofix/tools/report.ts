import { tool } from "@opencode-ai/plugin"
import path from "path"
import { resolveReportAdapter } from "../report/registry"
import type { ReportAdapterInput } from "../report/types"

export const autofixReportTool = tool({
  description:
    "统一安全扫描报告入口：通过 Report Adapter Registry 自动选择解析器，输出扫描器无关 RawFinding；只读。",
  args: {
    file: tool.schema.string().describe("当前项目/Worktree 内的报告路径"),
    format: tool.schema
      .string()
      .default("auto")
      .describe("可选格式提示，例如 auto/json/sarif/csv/tsv/markdown/text"),
    adapter: tool.schema
      .string()
      .default("auto")
      .describe("可选 Adapter ID；默认 auto 由 Registry 自动选择"),
  },
  async execute(args, context) {
    const root = path.resolve(context.worktree)
    const abs = path.resolve(root, args.file)
    if (!abs.startsWith(root + path.sep) && abs !== root) {
      throw new Error("安全报告必须位于当前项目 Worktree 内")
    }

    const file = Bun.file(abs)
    if (!(await file.exists())) throw new Error(`未找到安全报告：${args.file}`)

    const bytes = new Uint8Array(await file.arrayBuffer())
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes)
    const input: ReportAdapterInput = {
      filePath: args.file,
      absolutePath: abs,
      extension: path.extname(abs).toLowerCase(),
      formatHint: args.format,
      bytes,
      text,
    }

    const selected = await resolveReportAdapter(input, args.adapter)
    const result = await selected.parse(input)

    return JSON.stringify({
      ...result,
      report: {
        ...result.report,
        path: result.report?.path ?? args.file,
        adapter: selected.id,
      },
    })
  },
})
