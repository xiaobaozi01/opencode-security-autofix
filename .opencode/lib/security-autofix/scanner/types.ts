export type ScanMode = "targeted" | "full"
export type ScanStatus = "EXECUTED" | "FAIL" | "NOT_RUN"

export interface ScanRequest {
  mode: ScanMode
  repairEntryId?: string
  ruleId?: string
  findingId?: string
}

export interface ScannerAdapterContext {
  /** 当前 OpenCode Worktree 根目录 */
  worktreeRoot: string
  /** .opencode/security-autofix.json 的绝对路径 */
  configPath: string
}

export interface ScanResult {
  status: ScanStatus
  /** 扫描器逻辑名称，例如 security-test / secguard / command */
  scanner: string
  /** 实际执行的 Scanner Adapter ID */
  adapter: string
  /** 项目内相对报告路径；只有扫描器确实生成报告时才设置 */
  reportPath?: string
  /** 建议交给 autofix_report 的 Report Adapter ID；默认 auto */
  reportAdapter?: string
  /** 远端/异步扫描平台的任务 ID */
  taskId?: string
  exitCode?: number
  command?: string[]
  stdout?: string
  stderr?: string
  reason?: string
  metadata?: Record<string, unknown>
}

export interface ScannerAdapterConfig {
  /** 由 Registry 用来选择 Adapter */
  adapter: string
  /** 扫描器展示名称；不填时默认使用 adapter */
  name?: string
  /** 扫描报告默认交给哪个 Report Adapter；默认 auto */
  reportAdapter?: string
  [key: string]: unknown
}

export interface ScannerAdapter {
  /** Registry 中唯一且稳定的 ID */
  id: string
  /** 执行 Targeted 或 Full Scan；只负责扫描，不解析漏洞内容 */
  scan(
    config: ScannerAdapterConfig,
    request: ScanRequest,
    context: ScannerAdapterContext,
  ): Promise<ScanResult> | ScanResult
}
