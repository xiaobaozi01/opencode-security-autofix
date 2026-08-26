export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" | "UNKNOWN"
export type Confidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"

export interface StandardVulnerability {
  id?: string
  type: string
  cwe?: string
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
  scanner?: {
    name?: string
    rule?: string
    original_id?: string
  }
  evidence?: unknown[]
  raw_reference?: string
}
