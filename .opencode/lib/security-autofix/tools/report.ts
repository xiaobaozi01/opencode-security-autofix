import { tool } from "@opencode-ai/plugin"
import path from "path"
import { loadReport } from "../report/load"

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
    return JSON.stringify(await loadReport(root, args.file, args.format, args.adapter))
  },
})
