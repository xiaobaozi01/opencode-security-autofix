import { tool } from "@opencode-ai/plugin"
import path from "path"
import { resolveBuildCommand } from "./build-command"

export const autofixBuildTool = tool({
  description:
    "执行受限的编译/构建/测试命令，支持 Maven、Gradle、Node、Python、Go、.NET，不接受任意 Shell 命令。",
  args: {
    mode: tool.schema.enum(["compile", "build", "test"]),
    ecosystem: tool.schema
      .enum(["auto", "maven", "gradle", "node", "python", "go", "dotnet"])
      .default("auto")
      .describe("构建系统；auto 自动检测，多语言仓库应显式指定"),
    module: tool.schema.string().optional().describe("可选 Maven/Gradle 模块；拒绝 Shell 元字符"),
    test: tool.schema.string().optional().describe("可选测试选择器"),
  },
  async execute(args, context) {
    const root = path.resolve(context.worktree)
    if (args.module && /[;&|`$<>\n\r]/.test(args.module)) {
      throw new Error("模块参数包含不安全字符")
    }
    if (args.test && /[;&|`$<>\n\r]/.test(args.test)) {
      throw new Error("测试参数包含不安全字符")
    }

    const resolved = await resolveBuildCommand(root, args)
    if (!resolved.command) {
      return JSON.stringify({
        status: "NOT_RUN",
        ecosystem: resolved.ecosystem,
        reason: resolved.reason,
      })
    }
    const cmd = resolved.command

    const proc = Bun.spawn(cmd, { cwd: root, stdout: "pipe", stderr: "pipe" })
    const timer = setTimeout(() => proc.kill(), 900000)
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    clearTimeout(timer)
    const cap = (value: string) => (value.length > 16000 ? value.slice(-16000) : value)

    return JSON.stringify({
      status: code === 0 ? "PASS" : "FAIL",
      ecosystem: resolved.ecosystem,
      command: cmd,
      exitCode: code,
      stdout: cap(stdout),
      stderr: cap(stderr),
    })
  },
})
