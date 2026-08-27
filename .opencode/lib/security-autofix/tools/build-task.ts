import os from "node:os"
import path from "node:path"
import { stat } from "node:fs/promises"

export type BuildTaskKind = "compile" | "build" | "test"

export interface BuildTask {
  kind: BuildTaskKind
  command: string[]
  cwd?: string
  paths?: string[]
  description?: string
  env?: Record<string, string>
  timeoutMs?: number
}

export interface BuildConfiguration {
  tasks?: Record<string, BuildTask>
}

export interface BuildTaskRequest {
  task?: string
  args?: string[]
  env?: Record<string, string>
  timeoutMs?: number
}

export interface BuildTaskDescriptor {
  id: string
  kind?: BuildTaskKind
  cwd: string
  paths: string[]
  description?: string
}

export interface BuildTaskResolution {
  task?: string
  kind?: BuildTaskKind
  command?: string[]
  cwd?: string
  env?: Record<string, string>
  timeoutMs?: number
  availableTasks: BuildTaskDescriptor[]
  reason?: string
}

function expandVariables(value: string, workspaceRoot: string) {
  let expanded = value
    .replaceAll("${workspaceFolder}", workspaceRoot)
    .replaceAll("${userHome}", os.homedir())
  if (expanded === "~") return os.homedir()
  if (expanded.startsWith("~/") || expanded.startsWith(`~${path.sep}`)) {
    expanded = path.join(os.homedir(), expanded.slice(2))
  }
  return expanded
}

function invalidToken(value: string) {
  return value.includes("\0") || value.includes("\n") || value.includes("\r")
}

function validKind(value: unknown): value is BuildTaskKind {
  return value === "compile" || value === "build" || value === "test"
}

export function listBuildTasks(config: BuildConfiguration | undefined): BuildTaskDescriptor[] {
  return Object.entries(config?.tasks ?? {})
    .map(([id, task]) => ({
      id,
      kind: validKind(task?.kind) ? task.kind : undefined,
      cwd: typeof task?.cwd === "string" && task.cwd.trim() ? task.cwd.trim() : ".",
      paths: Array.isArray(task?.paths) ? task.paths.map(String) : [],
      description: typeof task?.description === "string" ? task.description : undefined,
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

async function resolveWorkingDirectory(workspaceRoot: string, configured: unknown) {
  const value = typeof configured === "string" && configured.trim() ? configured.trim() : "."
  const expanded = expandVariables(value, workspaceRoot)
  const cwd = path.isAbsolute(expanded)
    ? path.normalize(expanded)
    : path.resolve(workspaceRoot, expanded)
  const relative = path.relative(workspaceRoot, cwd)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return { reason: "Build Task cwd 必须位于项目工作区内" }
  }
  try {
    if (!(await stat(cwd)).isDirectory()) return { reason: `Build Task cwd 不是目录：${configured}` }
  } catch {
    return { reason: `Build Task cwd 不存在：${configured}` }
  }
  return { cwd }
}

export async function resolveBuildTask(
  workspaceRoot: string,
  request: BuildTaskRequest,
  config: BuildConfiguration | undefined,
): Promise<BuildTaskResolution> {
  const root = path.resolve(workspaceRoot)
  const availableTasks = listBuildTasks(config)
  if (request.task === undefined) return { availableTasks }

  const configuredTasks = config?.tasks
  const task = configuredTasks && Object.hasOwn(configuredTasks, request.task)
    ? configuredTasks[request.task]
    : undefined
  if (!task) {
    return { task: request.task, availableTasks, reason: `未配置 Build Task：${request.task}` }
  }
  if (!validKind(task.kind)) {
    return {
      task: request.task,
      availableTasks,
      reason: `Build Task ${request.task} 的 kind 必须是 compile、build 或 test`,
    }
  }
  if (!Array.isArray(task.command) || !task.command.length || task.command.some(value => typeof value !== "string")) {
    return {
      task: request.task,
      kind: task.kind,
      availableTasks,
      reason: `Build Task ${request.task} 缺少有效的 command 字符串数组`,
    }
  }

  const configuredTokens = task.command
  if (!configuredTokens[0].trim() || configuredTokens[0] === "{args}") {
    return {
      task: request.task,
      kind: task.kind,
      availableTasks,
      reason: `Build Task ${request.task} 的 command 第一项必须是固定可执行程序`,
    }
  }
  if (configuredTokens.some(token => invalidToken(token))) {
    return {
      task: request.task,
      kind: task.kind,
      availableTasks,
      reason: `Build Task ${request.task} 的 command 包含非法控制字符`,
    }
  }
  if (configuredTokens.some(token => token.includes("{args}") && token !== "{args}")) {
    return {
      task: request.task,
      kind: task.kind,
      availableTasks,
      reason: `Build Task ${request.task} 的 {args} 必须是独立数组元素`,
    }
  }
  const insertionCount = configuredTokens.filter(token => token === "{args}").length
  if (insertionCount > 1) {
    return {
      task: request.task,
      kind: task.kind,
      availableTasks,
      reason: `Build Task ${request.task} 最多只能包含一个 {args}`,
    }
  }

  const runtimeArgs = (request.args ?? []).map(value => expandVariables(value, root))
  if (runtimeArgs.some(arg => invalidToken(arg))) {
    return {
      task: request.task,
      kind: task.kind,
      availableTasks,
      reason: "Build Task 运行参数包含非法控制字符",
    }
  }
  const command = configuredTokens.flatMap(token =>
    token === "{args}" ? runtimeArgs : [expandVariables(token, root)],
  )
  if (!insertionCount) command.push(...runtimeArgs)
  if (!command[0]?.trim()) {
    return {
      task: request.task,
      kind: task.kind,
      availableTasks,
      reason: `Build Task ${request.task} 的可执行程序不能为空`,
    }
  }

  const workingDirectory = await resolveWorkingDirectory(root, task.cwd)
  if (!workingDirectory.cwd) {
    return {
      task: request.task,
      kind: task.kind,
      availableTasks,
      reason: workingDirectory.reason,
    }
  }

  const timeoutMs = request.timeoutMs ?? task.timeoutMs ?? 900000
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 3600000) {
    return {
      task: request.task,
      kind: task.kind,
      availableTasks,
      reason: "Build Task timeoutMs 必须介于 1000 和 3600000 之间",
    }
  }

  return {
    task: request.task,
    kind: task.kind,
    command,
    cwd: workingDirectory.cwd,
    env: { ...task.env, ...request.env },
    timeoutMs,
    availableTasks,
  }
}
