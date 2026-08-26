import type { ScannerAdapter } from "./types"
import { commandScannerAdapter } from "./builtin/command.adapter"

const adapters: ScannerAdapter[] = []

export function registerScannerAdapter(adapter: ScannerAdapter) {
  const index = adapters.findIndex(item => item.id === adapter.id)
  if (index >= 0) adapters[index] = adapter
  else adapters.push(adapter)
}

export function registerBuiltinScannerAdapters() {
  registerScannerAdapter(commandScannerAdapter)
}

export function resolveScannerAdapter(requestedAdapter: string): ScannerAdapter {
  const id = requestedAdapter?.trim()
  if (!id) throw new Error("scanner.adapter 不能为空")

  const adapter = adapters.find(item => item.id === id)
  if (!adapter) {
    throw new Error(
      `未注册 Scanner Adapter：${id}。已注册：${adapters
        .map(item => item.id)
        .join(", ")}`,
    )
  }
  return adapter
}

export function listScannerAdapters() {
  return adapters.map(item => ({ id: item.id }))
}
