import type {
  FindingClassification,
  RuleIdentity,
  TaxonomyReference,
} from "./classification/types"

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" | "UNKNOWN"
export type Confidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"

export interface StandardVulnerability {
  id?: string
  rule?: RuleIdentity
  taxonomies: TaxonomyReference[]
  raw_type?: string
  classification: FindingClassification
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
