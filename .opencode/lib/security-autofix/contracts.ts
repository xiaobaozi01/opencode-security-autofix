import type {
  RuleIdentity,
  SemanticRouteCandidate,
  TaxonomyReference,
} from "./finding/types"
import type { FindingIdentityStrength } from "./finding/identity"

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" | "UNKNOWN"
export type Confidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"

export interface StandardVulnerability {
  id?: string
  finding_key?: string
  finding_key_strength?: FindingIdentityStrength
  rule?: RuleIdentity
  taxonomies: TaxonomyReference[]
  raw_type?: string
  semantic_candidates?: SemanticRouteCandidate[]
  severity: Severity
  confidence: Confidence
  title?: string
  description?: string
  location?: {
    file?: string
    start_line?: number
    end_line?: number
    method?: string
  }
  source?: Record<string, unknown>
  sink?: Record<string, unknown>
  trace?: unknown[]
  evidence?: unknown[]
  raw_reference?: string
}
