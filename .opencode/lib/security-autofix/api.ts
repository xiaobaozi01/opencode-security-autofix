/**
 * Security AutoFix 插件扩展 API。
 * 团队自定义 OpenCode Plugin 可以从这里注册新的 Report Adapter、Scanner Adapter 或 Repair 路由。
 */
export { registerReportAdapter, listReportAdapters } from "./report/registry"
export type {
  RawFinding,
  ReportAdapter,
  ReportAdapterInput,
  ReportEnvelope,
} from "./report/types"

export { registerScannerAdapter, listScannerAdapters } from "./scanner/registry"
export type {
  ScanMode,
  ScanRequest,
  ScanResult,
  ScanStatus,
  ScannerAdapter,
  ScannerAdapterConfig,
  ScannerAdapterContext,
} from "./scanner/types"

export {
  registerRepairEntry,
  listRepairEntries,
} from "./repair/catalog"
export type { Fixability, RepairEntry } from "./repair/catalog"

export { routeFinding } from "./repair/router"
export type {
  AnalysisVerdict,
  RepairMatchKind,
  RepairRouteCandidate,
  RepairRouteInput,
  RepairRouteResult,
  RepairRouteStatus,
} from "./repair/router"
export {
  findingIdentity,
  findingIdentityKeys,
  withFindingIdentity,
} from "./finding/identity"
export type {
  FindingIdentityInput,
  FindingIdentityStrength,
} from "./finding/identity"
export type {
  RuleIdentity,
  SemanticRouteCandidate,
  TaxonomyReference,
} from "./finding/types"

export { prepareSpawnCommand } from "./process/spawn"
export type {
  CommandLauncher,
  ExecutableResolver,
  PreparedSpawnCommand,
  PrepareSpawnOptions,
} from "./process/spawn"
