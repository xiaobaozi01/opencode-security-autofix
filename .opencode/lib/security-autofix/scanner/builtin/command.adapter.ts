import path from "path"
import { mkdir } from "node:fs/promises"
import { prepareSpawnCommand } from "../../process/spawn.ts"
import type {
  ScanRequest,
  ScanResult,
  ScannerAdapter,
  ScannerAdapterConfig,
  ScannerAdapterContext,
} from "../types"

function substitute(token: string, vars: Record<string, string>) {
  return token.replace(/\{(repairEntryId|ruleId|findingId|output)\}/g, (_, key) => vars[key] ?? "")
}

function normalizeExtension(value: unknown) {
  const raw = typeof value === "string" && value.trim() ? value.trim() : ".json"
  const ext = raw.startsWith(".") ? raw : `.${raw}`
  if (!/^\.[A-Za-z0-9._-]+$/.test(ext)) throw new Error(`非法扫描报告扩展名：${raw}`)
  return ext
}

export function classifyScanOutcome(exitCode: number, outputExists: boolean, timedOut = false) {
  if (timedOut) {
    return { status: "FAIL" as const, reason: "扫描命令执行超时" }
  }
  if (exitCode !== 0) {
    return { status: "FAIL" as const, reason: `扫描命令退出码为 ${exitCode}` }
  }
  if (!outputExists) {
    return { status: "FAIL" as const, reason: "扫描命令成功退出但未生成报告" }
  }
  return { status: "EXECUTED" as const, reason: undefined }
}

export const commandScannerAdapter: ScannerAdapter = {
  id: "command",

  async scan(
    config: ScannerAdapterConfig,
    request: ScanRequest,
    context: ScannerAdapterContext,
  ): Promise<ScanResult> {
    const spec = config?.[request.mode] as Record<string, unknown> | undefined
    if (!spec || !Array.isArray(spec.command) || spec.command.length === 0) {
      return {
        status: "NOT_RUN",
        scanner: config.name ?? "command",
        adapter: "command",
        reason: `未配置 ${request.mode} 扫描命令`,
      }
    }

    const root = path.resolve(context.worktreeRoot)
    const outDir = path.join(root, ".opencode", ".cache", "security-autofix", "scans")
    await mkdir(outDir, { recursive: true })

    const extension = normalizeExtension(spec.outputExtension ?? config.outputExtension)
    const output = path.join(outDir, `${request.mode}-${Date.now()}${extension}`)
    const vars = {
      repairEntryId: request.repairEntryId ?? "",
      ruleId: request.ruleId ?? "",
      findingId: request.findingId ?? "",
      output,
    }

    const cmd = spec.command.map((value: unknown) => substitute(String(value), vars))
    if (cmd.some((value: string) => value.includes("\n") || value.includes("\r"))) {
      throw new Error("扫描命令参数包含非法换行字符")
    }

    const env = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
    )
    const prepared = prepareSpawnCommand(cmd, { cwd: root, env })
    const proc = Bun.spawn(prepared.command, {
      cwd: root,
      env,
      stdout: "pipe",
      stderr: "pipe",
      windowsVerbatimArguments: prepared.windowsVerbatimArguments,
    })
    const configuredTimeout = Number(spec.timeoutMs ?? 300000)
    if (!Number.isFinite(configuredTimeout) || configuredTimeout <= 0) {
      throw new Error(`非法扫描超时时间：${String(spec.timeoutMs)}`)
    }
    const timeout = Math.max(1000, Math.min(configuredTimeout, 1800000))
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      proc.kill()
    }, timeout)

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    clearTimeout(timer)

    const outputExists = await Bun.file(output).exists()
    const outcome = classifyScanOutcome(exitCode, outputExists, timedOut)
    return {
      status: outcome.status,
      scanner: config.name ?? "command",
      adapter: "command",
      reportPath: outputExists ? path.relative(root, output) : undefined,
      reportAdapter: String(spec.reportAdapter ?? config.reportAdapter ?? "auto"),
      command: cmd,
      exitCode,
      stdout: stdout.slice(-16000),
      stderr: stderr.slice(-16000),
      reason: outcome.reason,
    }
  },
}
