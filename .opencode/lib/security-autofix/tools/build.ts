import { tool } from "@opencode-ai/plugin"
import path from "node:path"
import { loadSecurityAutofixConfig } from "../config"
import { resolveBuildTask, type BuildTaskRequest } from "./build-task"

const namedValues = () =>
  tool.schema.array(
    tool.schema.object({
      name: tool.schema.string(),
      value: tool.schema.string(),
    }),
  )

function toRecord(values: Array<{ name: string; value: string }> | undefined) {
  return values ? Object.fromEntries(values.map(item => [item.name, item.value])) : undefined
}

export const autofixBuildTool = tool({
  description:
    "列出或执行 security-autofix.json 中的命名 Build Task。不传 task 时只列出可用任务；传入 task 时按配置命令执行。",
  args: {
    task: tool.schema.string().optional().describe("已配置的 Build Task ID；省略时列出可用任务"),
    args: tool.schema.array(tool.schema.string()).optional().describe("在 {args} 位置插入的额外 argv 参数"),
    env: namedValues().optional().describe("本次执行覆盖或追加的环境变量"),
    timeoutMs: tool.schema.number().optional().describe("本次执行的超时毫秒数，范围 1000 到 3600000"),
  },
  async execute(args, context) {
    const root = path.resolve(context.worktree)
    const { config } = await loadSecurityAutofixConfig(root)
    const request: BuildTaskRequest = {
      ...args,
      env: toRecord(args.env),
    }
    const resolved = await resolveBuildTask(root, request, config.build)

    if (args.task === undefined) {
      return JSON.stringify({ status: "LISTED", tasks: resolved.availableTasks })
    }
    if (!resolved.command) {
      return JSON.stringify({
        status: "NOT_RUN",
        task: resolved.task,
        kind: resolved.kind,
        reason: resolved.reason,
        tasks: resolved.availableTasks,
      })
    }

    const inheritedEnv = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
    )
    const proc = Bun.spawn(resolved.command, {
      cwd: resolved.cwd ?? root,
      env: { ...inheritedEnv, ...resolved.env },
      stdout: "pipe",
      stderr: "pipe",
    })
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      proc.kill()
    }, resolved.timeoutMs ?? 900000)
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    clearTimeout(timer)
    const cap = (value: string) => (value.length > 16000 ? value.slice(-16000) : value)

    return JSON.stringify({
      status: !timedOut && code === 0 ? "PASS" : "FAIL",
      task: resolved.task,
      kind: resolved.kind,
      command: resolved.command,
      cwd: path.relative(root, resolved.cwd ?? root).replace(/\\/g, "/") || ".",
      exitCode: code,
      reason: timedOut ? "Build Task 执行超时" : undefined,
      stdout: cap(stdout),
      stderr: cap(stderr),
    })
  },
})
