import path from "node:path"
import { withFindingIdentity } from "../finding/identity"
import { resolveReportAdapter } from "./registry"
import type { ReportAdapterInput, ReportEnvelope } from "./types"

export async function loadReport(
  worktreeRoot: string,
  filePath: string,
  formatHint = "auto",
  requestedAdapter = "auto",
): Promise<ReportEnvelope> {
  const root = path.resolve(worktreeRoot)
  const absolutePath = path.resolve(root, filePath)
  if (!absolutePath.startsWith(root + path.sep) && absolutePath !== root) {
    throw new Error("安全报告必须位于当前项目 Worktree 内")
  }

  const file = Bun.file(absolutePath)
  if (!(await file.exists())) throw new Error(`未找到安全报告：${filePath}`)

  const bytes = new Uint8Array(await file.arrayBuffer())
  const input: ReportAdapterInput = {
    filePath,
    absolutePath,
    extension: path.extname(absolutePath).toLowerCase(),
    formatHint,
    bytes,
    text: new TextDecoder("utf-8", { fatal: false }).decode(bytes),
  }
  const selected = await resolveReportAdapter(input, requestedAdapter)
  const result = await selected.parse(input)
  return {
    ...result,
    report: {
      ...result.report,
      path: result.report?.path ?? filePath,
      adapter: selected.id,
    },
    findings: result.findings.map(withFindingIdentity),
  }
}
