import path from "node:path"
import os from "node:os"
import { access, readFile, stat } from "node:fs/promises"

export type BuildAction = "compile" | "build" | "test"
export type BuildAdapterId = "maven" | "gradle" | "node" | "python"

export interface MavenBuildOptions {
  module?: string
  settings?: string
  globalSettings?: string
  profiles?: string[]
  properties?: Record<string, string>
  cliArgs?: string[]
}

export interface GradleBuildOptions {
  module?: string
  gradleUserHome?: string
  initScripts?: string[]
  projectProperties?: Record<string, string>
  systemProperties?: Record<string, string>
  cliArgs?: string[]
  taskArgs?: string[]
}

export interface NodeBuildOptions {
  packageManager?: "auto" | "npm" | "pnpm" | "yarn" | "bun"
  scripts?: Partial<Record<BuildAction, string>>
  cliArgs?: string[]
  scriptArgs?: string[]
}

export interface PythonBuildOptions {
  executable?: string
  configSettings?: Record<string, string>
  pytestArgs?: string[]
  buildArgs?: string[]
  compileArgs?: string[]
}

export interface BuildToolOptions {
  maven?: MavenBuildOptions
  gradle?: GradleBuildOptions
  node?: NodeBuildOptions
  python?: PythonBuildOptions
}

export interface BuildTargetConfiguration {
  cwd?: string
  timeoutMs?: number
  env?: Record<string, string>
  options?: BuildToolOptions
}

export interface BuildTarget extends BuildTargetConfiguration {
  adapter: BuildAdapterId
  configurations?: Record<string, BuildTargetConfiguration>
}

export interface BuildConfiguration {
  targets?: Record<string, BuildTarget>
}

export interface BuildCommandRequest {
  action: BuildAction
  adapter?: BuildAdapterId
  target?: string
  configuration?: string
  cwd?: string
  testSelector?: string
  timeoutMs?: number
  env?: Record<string, string>
  options?: BuildToolOptions
}

export interface BuildCommandResolution {
  adapter?: BuildAdapterId
  command?: string[]
  cwd?: string
  env?: Record<string, string>
  timeoutMs?: number
  target?: string
  configuration?: string
  reason?: string
}

interface BuildAdapter<TOptions> {
  id: BuildAdapterId
  detect(root: string): Promise<boolean>
  resolve(
    root: string,
    request: BuildCommandRequest,
    options: TOptions,
    workspaceRoot: string,
  ): Promise<Pick<BuildCommandResolution, "command" | "reason">>
}

async function exists(file: string) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

function mergeRecord<T extends object>(base: T | undefined, override: T | undefined): T | undefined {
  if (!base && !override) return undefined
  return { ...base, ...override } as T
}

function mergeBuildOptions(base: BuildToolOptions | undefined, override: BuildToolOptions | undefined) {
  if (!base && !override) return undefined
  return {
    maven:
      base?.maven || override?.maven
        ? {
            ...base?.maven,
            ...override?.maven,
            properties: mergeRecord(base?.maven?.properties, override?.maven?.properties),
          }
        : undefined,
    gradle:
      base?.gradle || override?.gradle
        ? {
            ...base?.gradle,
            ...override?.gradle,
            projectProperties: mergeRecord(
              base?.gradle?.projectProperties,
              override?.gradle?.projectProperties,
            ),
            systemProperties: mergeRecord(
              base?.gradle?.systemProperties,
              override?.gradle?.systemProperties,
            ),
          }
        : undefined,
    node:
      base?.node || override?.node
        ? {
            ...base?.node,
            ...override?.node,
            scripts: mergeRecord(base?.node?.scripts, override?.node?.scripts),
          }
        : undefined,
    python:
      base?.python || override?.python
        ? {
            ...base?.python,
            ...override?.python,
            configSettings: mergeRecord(
              base?.python?.configSettings,
              override?.python?.configSettings,
            ),
          }
        : undefined,
  } satisfies BuildToolOptions
}

function mergeRequestLayer(
  base: BuildCommandRequest,
  layer: BuildTargetConfiguration | BuildCommandRequest | undefined,
): BuildCommandRequest {
  if (!layer) return base
  return {
    ...base,
    ...layer,
    action: base.action,
    env: mergeRecord(base.env, layer.env),
    options: mergeBuildOptions(base.options, layer.options),
  }
}

function applyBuildConfiguration(
  request: BuildCommandRequest,
  config: BuildConfiguration | undefined,
): { request?: BuildCommandRequest; reason?: string } {
  if (!request.target) {
    if (request.configuration) return { reason: "configuration 必须与 target 一起使用" }
    if (!request.adapter) return { reason: "必须指定 Build target 或 adapter" }
    return { request }
  }

  if (request.adapter) return { reason: "target 和 adapter 只能指定一个" }

  const target = config?.targets?.[request.target]
  if (!target) return { reason: `未配置 Build Target：${request.target}` }

  const selected = request.configuration
    ? target.configurations?.[request.configuration]
    : undefined
  if (request.configuration && !selected) {
    return {
      reason: `Build Target ${request.target} 未配置 Configuration：${request.configuration}`,
    }
  }

  const targetLayer: BuildTargetConfiguration = {
    cwd: target.cwd,
    timeoutMs: target.timeoutMs,
    env: target.env,
    options: target.options,
  }
  let merged: BuildCommandRequest = {
    action: request.action,
    adapter: target.adapter,
    target: request.target,
    configuration: request.configuration,
  }
  merged = mergeRequestLayer(merged, targetLayer)
  merged = mergeRequestLayer(merged, selected)
  merged = mergeRequestLayer(merged, request)
  merged.adapter = target.adapter
  return { request: merged }
}

function expandPath(value: string, base: string, workspaceRoot = base) {
  let expanded = value
    .replaceAll("${workspaceFolder}", workspaceRoot)
    .replaceAll("${userHome}", os.homedir())
  if (expanded === "~") expanded = os.homedir()
  else if (expanded.startsWith(`~${path.sep}`) || expanded.startsWith("~/")) {
    expanded = path.join(os.homedir(), expanded.slice(2))
  }
  return path.isAbsolute(expanded) ? path.normalize(expanded) : path.resolve(base, expanded)
}

async function resolveWorkingDirectory(root: string, configured: string | undefined) {
  const cwd = configured ? expandPath(configured, root) : root
  const relative = path.relative(root, cwd)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return { reason: "Build cwd 必须位于项目工作区内" }
  }
  try {
    if (!(await stat(cwd)).isDirectory()) return { reason: `Build cwd 不是目录：${configured}` }
  } catch {
    return { reason: `Build cwd 不存在：${configured}` }
  }
  return { cwd }
}

async function existingPath(
  base: string,
  configured: string,
  label: string,
  workspaceRoot: string,
) {
  const resolved = expandPath(configured, base, workspaceRoot)
  return (await exists(resolved))
    ? { path: resolved }
    : { reason: `${label} 不存在：${configured}` }
}

function gradleTask(module: string | undefined, task: string) {
  if (!module) return task
  const prefix = module.startsWith(":") ? module : `:${module}`
  return `${prefix}:${task}`
}

const mavenAdapter: BuildAdapter<MavenBuildOptions> = {
  id: "maven",
  detect: root => exists(path.join(root, "pom.xml")),
  async resolve(root, request, options, workspaceRoot) {
    const mvn =
      process.platform === "win32" && (await exists(path.join(root, "mvnw.cmd")))
        ? "mvnw.cmd"
        : await exists(path.join(root, "mvnw"))
          ? "./mvnw"
          : "mvn"
    const command = [mvn, "-q"]

    if (options.settings) {
      const result = await existingPath(root, options.settings, "Maven settings", workspaceRoot)
      if (!result.path) return { reason: result.reason }
      command.push("--settings", result.path)
    }
    if (options.globalSettings) {
      const result = await existingPath(
        root,
        options.globalSettings,
        "Maven global settings",
        workspaceRoot,
      )
      if (!result.path) return { reason: result.reason }
      command.push("--global-settings", result.path)
    }
    if (options.profiles?.length) command.push(`-P${options.profiles.join(",")}`)
    for (const [name, value] of Object.entries(options.properties ?? {})) {
      command.push(`-D${name}=${value}`)
    }
    command.push(...(options.cliArgs ?? []))
    if (options.module) command.push("-pl", options.module, "-am")

    if (request.action === "test") {
      if (request.testSelector) command.push(`-Dtest=${request.testSelector}`)
      command.push("test")
    } else if (request.action === "compile") {
      command.push("-DskipTests", "compile")
    } else {
      command.push("verify", "-DskipTests")
    }
    return { command }
  },
}

const gradleAdapter: BuildAdapter<GradleBuildOptions> = {
  id: "gradle",
  detect: async root =>
    (await exists(path.join(root, "gradlew"))) ||
    (await exists(path.join(root, "gradlew.bat"))) ||
    (await exists(path.join(root, "build.gradle"))) ||
    (await exists(path.join(root, "build.gradle.kts"))),
  async resolve(root, request, options, workspaceRoot) {
    const gradle =
      process.platform === "win32" && (await exists(path.join(root, "gradlew.bat")))
        ? "gradlew.bat"
        : await exists(path.join(root, "gradlew"))
          ? "./gradlew"
          : "gradle"
    const command = [gradle]

    if (options.gradleUserHome) {
      command.push(
        `--gradle-user-home=${expandPath(options.gradleUserHome, root, workspaceRoot)}`,
      )
    }
    for (const script of options.initScripts ?? []) {
      const result = await existingPath(root, script, "Gradle init script", workspaceRoot)
      if (!result.path) return { reason: result.reason }
      command.push("--init-script", result.path)
    }
    for (const [name, value] of Object.entries(options.projectProperties ?? {})) {
      command.push(`-P${name}=${value}`)
    }
    for (const [name, value] of Object.entries(options.systemProperties ?? {})) {
      command.push(`-D${name}=${value}`)
    }
    command.push(...(options.cliArgs ?? []))

    const task = request.action === "compile" ? "classes" : request.action
    command.push(gradleTask(options.module, task))
    if (request.action !== "test") command.push("-x", "test")
    if (request.testSelector && request.action === "test") {
      command.push("--tests", request.testSelector)
    }
    command.push(...(options.taskArgs ?? []))
    return { command }
  },
}

async function packageManager(root: string, configured: NodeBuildOptions["packageManager"]) {
  if (configured && configured !== "auto") return configured
  return (await exists(path.join(root, "pnpm-lock.yaml")))
    ? "pnpm"
    : await exists(path.join(root, "yarn.lock"))
      ? "yarn"
      : (await exists(path.join(root, "bun.lockb"))) || (await exists(path.join(root, "bun.lock")))
        ? "bun"
        : "npm"
}

const nodeAdapter: BuildAdapter<NodeBuildOptions> = {
  id: "node",
  detect: root => exists(path.join(root, "package.json")),
  async resolve(root, request, options) {
    let pkg: { scripts?: Record<string, string> }
    try {
      pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
    } catch (error) {
      return {
        reason: `package.json 解析失败：${error instanceof Error ? error.message : String(error)}`,
      }
    }

    const configuredScript = options.scripts?.[request.action]
    const script =
      configuredScript ??
      (request.action === "test"
        ? pkg.scripts?.test
          ? "test"
          : undefined
        : request.action === "compile"
          ? pkg.scripts?.compile
            ? "compile"
            : pkg.scripts?.build
              ? "build"
              : undefined
          : pkg.scripts?.build
            ? "build"
            : undefined)

    if (!script) return { reason: `package.json 未配置 ${request.action} 对应脚本` }
    if (!pkg.scripts?.[script]) return { reason: `package.json 未配置脚本：${script}` }

    const runner = await packageManager(root, options.packageManager)
    const command = [runner, ...(options.cliArgs ?? []), "run", script]
    const scriptArgs = [
      ...(request.action === "test" && request.testSelector ? [request.testSelector] : []),
      ...(options.scriptArgs ?? []),
    ]
    if (scriptArgs.length) command.push("--", ...scriptArgs)
    return { command }
  },
}

async function pythonExecutable(
  root: string,
  configured: string | undefined,
  workspaceRoot: string,
) {
  if (configured) {
    if (
      configured.includes("/") ||
      configured.includes("\\") ||
      configured.startsWith("~") ||
      configured.includes("${")
    ) {
      return expandPath(configured, root, workspaceRoot)
    }
    return configured
  }
  const candidates =
    process.platform === "win32"
      ? [path.join(root, ".venv", "Scripts", "python.exe"), "python"]
      : [path.join(root, ".venv", "bin", "python"), "python3"]
  return (await exists(candidates[0])) ? candidates[0] : candidates[1]
}

const pythonAdapter: BuildAdapter<PythonBuildOptions> = {
  id: "python",
  detect: async root =>
    (await exists(path.join(root, "pyproject.toml"))) ||
    (await exists(path.join(root, "setup.py"))) ||
    (await exists(path.join(root, "setup.cfg"))) ||
    (await exists(path.join(root, "requirements.txt"))) ||
    (await exists(path.join(root, "pytest.ini"))),
  async resolve(root, request, options, workspaceRoot) {
    const python = await pythonExecutable(root, options.executable, workspaceRoot)
    if (request.action === "test") {
      const command = [python, "-m", "pytest"]
      if (request.testSelector) command.push(request.testSelector)
      command.push(...(options.pytestArgs ?? []))
      return { command }
    }
    if (request.action === "compile") {
      return {
        command: [python, "-m", "compileall", "-q", ...(options.compileArgs ?? []), "."],
      }
    }
    if (!(await exists(path.join(root, "pyproject.toml"))) && !(await exists(path.join(root, "setup.py")))) {
      return { reason: "未检测到 pyproject.toml 或 setup.py，无法执行 Python Build" }
    }
    const command = [python, "-m", "build", "--no-isolation"]
    for (const [name, value] of Object.entries(options.configSettings ?? {})) {
      command.push("-C", `${name}=${value}`)
    }
    command.push(...(options.buildArgs ?? []))
    return { command }
  },
}

const buildAdapters: BuildAdapter<any>[] = [
  mavenAdapter,
  gradleAdapter,
  nodeAdapter,
  pythonAdapter,
]

export function listBuildAdapters() {
  return buildAdapters.map(adapter => adapter.id)
}

export async function resolveBuildCommand(
  root: string,
  request: BuildCommandRequest,
  config?: BuildConfiguration,
): Promise<BuildCommandResolution> {
  const configured = applyBuildConfiguration(request, config)
  if (!configured.request) return { reason: configured.reason }
  const effective = configured.request

  const workingDirectory = await resolveWorkingDirectory(path.resolve(root), effective.cwd)
  if (!workingDirectory.cwd) return { reason: workingDirectory.reason }
  const cwd = workingDirectory.cwd

  const candidate = buildAdapters.find(item => item.id === effective.adapter)
  const adapter = candidate && (await candidate.detect(cwd)) ? candidate : undefined

  if (!adapter) {
    return {
      adapter: effective.adapter,
      cwd,
      target: effective.target,
      configuration: effective.configuration,
      reason: `当前目录未检测到 Build Adapter 所需的项目文件：${effective.adapter}`,
    }
  }

  const timeoutMs = effective.timeoutMs ?? 900000
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 3600000) {
    return {
      adapter: adapter.id,
      cwd,
      target: effective.target,
      configuration: effective.configuration,
      reason: "Build timeoutMs 必须在 1000 到 3600000 毫秒之间",
    }
  }

  const resolved = await adapter.resolve(
    cwd,
    effective,
    effective.options?.[adapter.id] ?? {},
    path.resolve(root),
  )
  return {
    ...resolved,
    adapter: adapter.id,
    cwd,
    env: effective.env,
    timeoutMs,
    target: effective.target,
    configuration: effective.configuration,
  }
}
