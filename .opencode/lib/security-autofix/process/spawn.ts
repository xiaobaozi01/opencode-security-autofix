import path from "node:path"

export type CommandLauncher = "DIRECT" | "CMD"

export interface ExecutableLookupOptions {
  cwd: string
  PATH?: string
}

export type ExecutableResolver = (
  executable: string,
  options: ExecutableLookupOptions,
) => string | null | undefined

export interface PrepareSpawnOptions {
  cwd: string
  env: Record<string, string>
  platform?: NodeJS.Platform
  resolveExecutable?: ExecutableResolver
  comspec?: string
}

export interface PreparedSpawnCommand {
  command: string[]
  launcher: CommandLauncher
  resolvedExecutable?: string
  windowsVerbatimArguments?: boolean
}

export interface KillableProcess {
  pid: number
  kill(signal?: number | NodeJS.Signals): void
}

export function mergeEnvironment(
  base: Record<string, string>,
  override: Record<string, string> = {},
  platform: NodeJS.Platform = process.platform,
) {
  if (platform !== "win32") return { ...base, ...override }
  const merged: Record<string, string> = {}
  for (const [name, value] of [...Object.entries(base), ...Object.entries(override)]) {
    const previous = Object.keys(merged).find(key => key.toLowerCase() === name.toLowerCase())
    if (previous) delete merged[previous]
    merged[name] = value
  }
  return merged
}

export async function terminateProcessTree(
  proc: KillableProcess,
  platform: NodeJS.Platform = process.platform,
) {
  if (platform === "win32") {
    try {
      const killer = Bun.spawn(["taskkill.exe", "/pid", String(proc.pid), "/t", "/f"], {
        stdout: "ignore",
        stderr: "ignore",
      })
      if (await killer.exited === 0) return
    } catch {
      // Fall through to the runtime's direct child termination.
    }
  } else {
    try {
      process.kill(-proc.pid, "SIGTERM")
      return
    } catch {
      // The process may not have formed a group yet; fall back to direct kill.
    }
  }
  proc.kill()
}

const CMD_META = /([()\][%!^"`<>&|;, *?])/g

function environmentValue(env: Record<string, string>, name: string) {
  const key = Object.keys(env).find(item => item.toLowerCase() === name.toLowerCase())
  return key ? env[key] : undefined
}

function escapeCmdCommand(value: string) {
  return value.replace(CMD_META, "^$1")
}

function escapeCmdArgument(value: string, doubleEscapeMeta: boolean) {
  let escaped = String(value)
    .replace(/(?=(\\+?)?)\1"/g, "$1$1\\\"")
    .replace(/(?=(\\+?)?)\1$/, "$1$1")
  escaped = `"${escaped}"`.replace(CMD_META, "^$1")
  return doubleEscapeMeta ? escaped.replace(CMD_META, "^$1") : escaped
}

/**
 * Keep argv execution on POSIX and for native Windows executables. Windows
 * command shims and batch files require cmd.exe, even when they are found via
 * PATH/PATHEXT (for example mvn.cmd, npm.cmd, pnpm.cmd and gradlew.bat).
 */
export function prepareSpawnCommand(
  requestedCommand: string[],
  options: PrepareSpawnOptions,
): PreparedSpawnCommand {
  if (!requestedCommand.length) throw new Error("命令不能为空")
  const platform = options.platform ?? process.platform
  if (platform !== "win32") {
    return { command: [...requestedCommand], launcher: "DIRECT" }
  }

  const resolver = options.resolveExecutable ?? ((executable, lookup) =>
    Bun.which(executable, lookup))
  const resolvedExecutable = resolver(requestedCommand[0], {
    cwd: options.cwd,
    PATH: environmentValue(options.env, "PATH"),
  }) ?? undefined
  const executable = resolvedExecutable ?? requestedCommand[0]

  if (!/\.(?:cmd|bat)$/i.test(executable)) {
    return {
      command: [resolvedExecutable ?? requestedCommand[0], ...requestedCommand.slice(1)],
      launcher: "DIRECT",
      resolvedExecutable,
    }
  }

  const normalizedExecutable = path.win32.normalize(executable)
  const doubleEscapeMeta = /node_modules[\\/]\.bin[\\/][^\\/]+\.cmd$/i.test(
    normalizedExecutable,
  )
  const shellCommand = [
    escapeCmdCommand(normalizedExecutable),
    ...requestedCommand.slice(1).map(argument => escapeCmdArgument(argument, doubleEscapeMeta)),
  ].join(" ")
  const comspec = options.comspec ?? environmentValue(options.env, "COMSPEC") ?? "cmd.exe"

  return {
    command: [comspec, "/d", "/s", "/c", `"${shellCommand}"`],
    launcher: "CMD",
    resolvedExecutable,
    windowsVerbatimArguments: true,
  }
}
