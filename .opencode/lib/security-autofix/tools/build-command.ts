import path from "node:path"
import { access, readdir, readFile } from "node:fs/promises"

export type BuildMode = "compile" | "build" | "test"
export type BuildEcosystem = "auto" | "maven" | "gradle" | "node" | "python" | "go" | "dotnet"

export interface BuildCommandRequest {
  mode: BuildMode
  ecosystem?: BuildEcosystem
  module?: string
  test?: string
}

export interface BuildCommandResolution {
  ecosystem?: Exclude<BuildEcosystem, "auto">
  command?: string[]
  reason?: string
}

async function exists(file: string) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

async function detectEcosystems(root: string) {
  const names = await readdir(root).catch(() => [] as string[])
  const hasDotnetProject = names.some(name => /\.(sln|csproj)$/i.test(name))

  return {
    maven: await exists(path.join(root, "pom.xml")),
    gradle:
      (await exists(path.join(root, "gradlew"))) ||
      (await exists(path.join(root, "gradlew.bat"))) ||
      (await exists(path.join(root, "build.gradle"))) ||
      (await exists(path.join(root, "build.gradle.kts"))),
    node: await exists(path.join(root, "package.json")),
    python:
      (await exists(path.join(root, "pyproject.toml"))) ||
      (await exists(path.join(root, "setup.py"))) ||
      (await exists(path.join(root, "setup.cfg"))) ||
      (await exists(path.join(root, "requirements.txt"))) ||
      (await exists(path.join(root, "pytest.ini"))),
    go: await exists(path.join(root, "go.mod")),
    dotnet: hasDotnetProject,
  }
}

function gradleTask(module: string | undefined, task: string) {
  if (!module) return task
  const prefix = module.startsWith(":") ? module : `:${module}`
  return `${prefix}:${task}`
}

async function resolveMaven(root: string, request: BuildCommandRequest) {
  const mvn =
    process.platform === "win32" && (await exists(path.join(root, "mvnw.cmd")))
      ? "mvnw.cmd"
      : await exists(path.join(root, "mvnw"))
        ? "./mvnw"
        : "mvn"
  const command = [mvn, "-q"]
  if (request.module) command.push("-pl", request.module, "-am")

  if (request.mode === "test") {
    if (request.test) command.push(`-Dtest=${request.test}`)
    command.push("test")
  } else if (request.mode === "compile") {
    command.push("-DskipTests", "compile")
  } else {
    command.push("verify", "-DskipTests")
  }
  return command
}

async function resolveGradle(root: string, request: BuildCommandRequest) {
  const gradle =
    process.platform === "win32" && (await exists(path.join(root, "gradlew.bat")))
      ? "gradlew.bat"
      : await exists(path.join(root, "gradlew"))
        ? "./gradlew"
        : "gradle"
  const task = request.mode === "compile" ? "classes" : request.mode
  const command = [gradle, gradleTask(request.module, task)]
  if (request.mode !== "test") command.push("-x", "test")
  if (request.test && request.mode === "test") command.push("--tests", request.test)
  return command
}

async function resolveNode(root: string, request: BuildCommandRequest): Promise<BuildCommandResolution> {
  let pkg: { scripts?: Record<string, string> }
  try {
    pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
  } catch (error) {
    return {
      ecosystem: "node",
      reason: `package.json 解析失败：${error instanceof Error ? error.message : String(error)}`,
    }
  }

  const script =
    request.mode === "test"
      ? pkg.scripts?.test
        ? "test"
        : undefined
      : request.mode === "compile"
        ? pkg.scripts?.compile
          ? "compile"
          : pkg.scripts?.build
            ? "build"
            : undefined
        : pkg.scripts?.build
          ? "build"
          : undefined

  if (!script) {
    return { ecosystem: "node", reason: `package.json 未配置 ${request.mode} 对应脚本` }
  }

  const runner = (await exists(path.join(root, "pnpm-lock.yaml")))
    ? "pnpm"
    : await exists(path.join(root, "yarn.lock"))
      ? "yarn"
      : (await exists(path.join(root, "bun.lockb"))) || (await exists(path.join(root, "bun.lock")))
        ? "bun"
        : "npm"
  const command = runner === "npm" ? ["npm", "run", script] : [runner, "run", script]
  if (request.mode === "test" && request.test) command.push("--", request.test)
  return { ecosystem: "node", command }
}

async function pythonExecutable(root: string) {
  const candidates =
    process.platform === "win32"
      ? [path.join(root, ".venv", "Scripts", "python.exe"), "python"]
      : [path.join(root, ".venv", "bin", "python"), "python3"]
  return (await exists(candidates[0])) ? candidates[0] : candidates[1]
}

async function resolvePython(root: string, request: BuildCommandRequest): Promise<BuildCommandResolution> {
  const python = await pythonExecutable(root)
  if (request.mode === "test") {
    const command = [python, "-m", "pytest"]
    if (request.test) command.push(request.test)
    return { ecosystem: "python", command }
  }
  if (request.mode === "compile") {
    return { ecosystem: "python", command: [python, "-m", "compileall", "-q", "."] }
  }
  if (!(await exists(path.join(root, "pyproject.toml"))) && !(await exists(path.join(root, "setup.py")))) {
    return { ecosystem: "python", reason: "未检测到 pyproject.toml 或 setup.py，无法执行 Python Build" }
  }
  return { ecosystem: "python", command: [python, "-m", "build", "--no-isolation"] }
}

async function resolveDotnet(root: string, request: BuildCommandRequest): Promise<BuildCommandResolution> {
  const names = (await readdir(root)).filter(name => /\.(sln|csproj)$/i.test(name)).sort()
  const target = names.find(name => name.toLowerCase().endsWith(".sln")) ?? names[0]
  if (!target) return { ecosystem: "dotnet", reason: "未检测到 .sln 或 .csproj" }

  const command = ["dotnet", request.mode === "test" ? "test" : "build", target]
  if (request.mode === "test" && request.test) command.push("--filter", request.test)
  return { ecosystem: "dotnet", command }
}

export async function resolveBuildCommand(
  root: string,
  request: BuildCommandRequest,
): Promise<BuildCommandResolution> {
  const detected = await detectEcosystems(root)
  const requested = request.ecosystem ?? "auto"
  const ecosystem =
    requested === "auto"
      ? ((["maven", "gradle", "node", "python", "go", "dotnet"] as const).find(
          candidate => detected[candidate],
        ) ?? undefined)
      : requested

  if (!ecosystem || !detected[ecosystem]) {
    return {
      ecosystem: ecosystem || undefined,
      reason:
        requested === "auto"
          ? "未识别到受支持的构建系统"
          : `未检测到指定构建系统：${requested}`,
    }
  }

  if (ecosystem === "maven") {
    return { ecosystem, command: await resolveMaven(root, request) }
  }
  if (ecosystem === "gradle") {
    return { ecosystem, command: await resolveGradle(root, request) }
  }
  if (ecosystem === "node") return await resolveNode(root, request)
  if (ecosystem === "python") return await resolvePython(root, request)
  if (ecosystem === "go") {
    const command = request.mode === "test" ? ["go", "test"] : ["go", "build"]
    if (request.mode === "test" && request.test) command.push("-run", request.test)
    command.push("./...")
    return { ecosystem, command }
  }
  return await resolveDotnet(root, request)
}
