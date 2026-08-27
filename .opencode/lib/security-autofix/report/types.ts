import type { FindingIdentityStrength } from "../finding/identity"
import type { RuleIdentity, TaxonomyReference } from "../finding/types"

export interface RawFinding {
  original_id?: string
  finding_key?: string
  finding_key_strength?: FindingIdentityStrength
  rule?: RuleIdentity
  taxonomies: TaxonomyReference[]
  raw_type?: string
  title?: string
  description?: string
  severity?: string
  location?: {
    file?: string
    start_line?: number
    end_line?: number
    method?: string
  }
  raw: unknown
}

export interface ReportEnvelope {
  report: {
    path: string
    format?: string
    scanner?: string
    adapter: string
    [key: string]: any
  }
  findings: RawFinding[]
  warnings: string[]
}

export interface ReportAdapterInput {
  /** 用户传入的项目内相对路径 */
  filePath: string
  /** 已经过 Worktree 边界校验的绝对路径 */
  absolutePath: string
  /** 小写扩展名，例如 .json / .sarif / .xlsx */
  extension: string
  /** 用户可选的格式提示，例如 json / sarif / csv */
  formatHint: string
  /** 文件原始字节，二进制 Adapter（例如 XLSX）可直接使用 */
  bytes: Uint8Array
  /** UTF-8 文本视图；二进制 Adapter 不应依赖它 */
  text: string
}

export interface ReportAdapter {
  /** Registry 中唯一的稳定标识 */
  id: string
  /** 数值越大越优先；通用兜底 Adapter 应保持较低优先级 */
  priority: number
  /** 判断当前报告是否由本 Adapter 处理；不得修改任何文件 */
  supports(input: ReportAdapterInput): boolean | Promise<boolean>
  /** 将报告确定性转换为统一 Envelope */
  parse(input: ReportAdapterInput): Promise<ReportEnvelope> | ReportEnvelope
}
