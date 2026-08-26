import type { ReportAdapter, ReportAdapterInput } from "./types"
import { sarifReportAdapter } from "./builtin/sarif.adapter"
import { jsonReportAdapter } from "./builtin/json.adapter"
import { delimitedReportAdapter } from "./builtin/delimited.adapter"
import { textReportAdapter } from "./builtin/text.adapter"

const adapters: ReportAdapter[] = []

export function registerReportAdapter(adapter: ReportAdapter) {
  const index = adapters.findIndex(item => item.id === adapter.id)
  if (index >= 0) adapters[index] = adapter
  else adapters.push(adapter)
}

export function registerBuiltinReportAdapters() {
  for (const adapter of [
    sarifReportAdapter,
    jsonReportAdapter,
    delimitedReportAdapter,
    textReportAdapter,
  ]) {
    registerReportAdapter(adapter)
  }
}

export async function resolveReportAdapter(
  input: ReportAdapterInput,
  requestedAdapter = "auto",
): Promise<ReportAdapter> {
  if (requestedAdapter !== "auto") {
    const exact = adapters.find(item => item.id === requestedAdapter)
    if (!exact) {
      throw new Error(
        `未注册 Report Adapter：${requestedAdapter}。已注册：${adapters
          .map(item => item.id)
          .join(", ")}`,
      )
    }
    return exact
  }

  const ordered = [...adapters].sort((a, b) => b.priority - a.priority)
  for (const adapter of ordered) {
    if (await adapter.supports(input)) return adapter
  }

  throw new Error("没有 Report Adapter 能处理该扫描报告")
}

export function listReportAdapters() {
  return [...adapters]
    .sort((a, b) => b.priority - a.priority)
    .map(item => ({ id: item.id, priority: item.priority }))
}
