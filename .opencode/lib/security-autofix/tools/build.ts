import { tool } from "@opencode-ai/plugin"
import path from "path"
import { loadSecurityAutofixConfig } from "../config"
import {
  type BuildCommandRequest,
  type BuildToolOptions,
  resolveBuildCommand,
} from "./build-command"

const strings = () => tool.schema.array(tool.schema.string())
const namedValues = () =>
  tool.schema.array(
    tool.schema.object({
      name: tool.schema.string(),
      value: tool.schema.string(),
    }),
  )

const buildOptionsSchema = tool.schema.object({
  maven: tool.schema
    .object({
      module: tool.schema.string().optional(),
      settings: tool.schema.string().optional(),
      globalSettings: tool.schema.string().optional(),
      profiles: strings().optional(),
      properties: namedValues().optional(),
      cliArgs: strings().optional(),
    })
    .optional(),
  gradle: tool.schema
    .object({
      module: tool.schema.string().optional(),
      gradleUserHome: tool.schema.string().optional(),
      initScripts: strings().optional(),
      projectProperties: namedValues().optional(),
      systemProperties: namedValues().optional(),
      cliArgs: strings().optional(),
      taskArgs: strings().optional(),
    })
    .optional(),
  node: tool.schema
    .object({
      packageManager: tool.schema
        .enum(["auto", "npm", "pnpm", "yarn", "bun"])
        .optional(),
      scripts: tool.schema
        .object({
          compile: tool.schema.string().optional(),
          build: tool.schema.string().optional(),
          test: tool.schema.string().optional(),
        })
        .optional(),
      cliArgs: strings().optional(),
      scriptArgs: strings().optional(),
    })
    .optional(),
  python: tool.schema
    .object({
      executable: tool.schema.string().optional(),
      configSettings: namedValues().optional(),
      pytestArgs: strings().optional(),
      buildArgs: strings().optional(),
      compileArgs: strings().optional(),
    })
    .optional(),
})

function toRecord(values: Array<{ name: string; value: string }> | undefined) {
  if (!values) return undefined
  return Object.fromEntries(values.map(item => [item.name, item.value]))
}

function normalizeOptions(options: any): BuildToolOptions | undefined {
  if (!options) return undefined
  return {
    maven: options.maven
      ? { ...options.maven, properties: toRecord(options.maven.properties) }
      : undefined,
    gradle: options.gradle
      ? {
          ...options.gradle,
          projectProperties: toRecord(options.gradle.projectProperties),
          systemProperties: toRecord(options.gradle.systemProperties),
        }
      : undefined,
    node: options.node,
    python: options.python
      ? { ...options.python, configSettings: toRecord(options.python.configSettings) }
      : undefined,
  }
}

export const autofixBuildTool = tool({
  description:
    "通过命名 Target 或显式 Adapter 执行 Maven、Gradle、Node、Python 的编译/构建/测试；不自动猜测构建系统，不接受任意 Shell 命令。",
  args: {
    action: tool.schema.enum(["compile", "build", "test"]),
    target: tool.schema
      .string()
      .optional()
      .describe("security-autofix.json 中的命名 Build Target；与 adapter 二选一"),
    adapter: tool.schema
      .enum(["maven", "gradle", "node", "python"])
      .optional()
      .describe("直接使用的 Build Adapter；与 target 二选一"),
    configuration: tool.schema
      .string()
      .optional()
      .describe("Target 下的命名配置，例如 ci、local、release"),
    cwd: tool.schema.string().optional().describe("项目内相对工作目录；本次调用覆盖 Target 配置"),
    testSelector: tool.schema.string().optional().describe("test 动作的针对性测试选择器"),
    timeoutMs: tool.schema
      .number()
      .optional()
      .describe("超时毫秒数，范围 1000 到 3600000"),
    env: namedValues().optional().describe("本次构建附加环境变量 name/value 列表"),
    options: buildOptionsSchema
      .optional()
      .describe("按 maven、gradle、node、python 分类的结构化构建参数"),
  },
  async execute(args, context) {
    const root = path.resolve(context.worktree)
    const { config } = await loadSecurityAutofixConfig(root)
    const request: BuildCommandRequest = {
      ...args,
      env: toRecord(args.env),
      options: normalizeOptions(args.options),
    }

    const resolved = await resolveBuildCommand(root, request, config.build)
    if (!resolved.command) {
      return JSON.stringify({
        status: "NOT_RUN",
        adapter: resolved.adapter,
        target: resolved.target,
        configuration: resolved.configuration,
        reason: resolved.reason,
      })
    }
    const cmd = resolved.command
    const inheritedEnv = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
    )
    const proc = Bun.spawn(cmd, {
      cwd: resolved.cwd ?? root,
      env: { ...inheritedEnv, ...resolved.env },
      stdout: "pipe",
      stderr: "pipe",
    })
    const timer = setTimeout(() => proc.kill(), resolved.timeoutMs ?? 900000)
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    clearTimeout(timer)
    const cap = (value: string) => (value.length > 16000 ? value.slice(-16000) : value)

    return JSON.stringify({
      status: code === 0 ? "PASS" : "FAIL",
      adapter: resolved.adapter,
      target: resolved.target,
      configuration: resolved.configuration,
      command: cmd,
      cwd: path.relative(root, resolved.cwd ?? root).replace(/\\/g, "/") || ".",
      exitCode: code,
      stdout: cap(stdout),
      stderr: cap(stderr),
    })
  },
})
