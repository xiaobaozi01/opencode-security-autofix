export type EvidenceSource = "scanner" | "adapter" | "analyzer" | "user"

export interface RuleIdentity {
  scanner?: string
  rule_id?: string
  rule_version?: string
  fingerprint?: string
  fingerprints?: Record<string, string>
  partial_fingerprints?: Record<string, string>
  source?: EvidenceSource
}

export interface TaxonomyReference {
  name: string
  id: string
  relationship?: "equal" | "subset" | "superset" | "relevant"
  source: EvidenceSource
}

export interface SemanticRouteCandidate {
  display_type: string
  confidence: "HIGH" | "MEDIUM" | "LOW"
  evidence?: string[]
}
