export interface RuleIdentity {
  scanner?: string
  rule_id?: string
  rule_version?: string
  fingerprint?: string
}

export interface TaxonomyReference {
  name: string
  id: string
  relationship?: "equal" | "subset" | "superset" | "relevant"
  source: "scanner" | "adapter" | "analyzer"
}

export interface SemanticRouteCandidate {
  display_type: string
  confidence: "HIGH" | "MEDIUM" | "LOW"
  evidence?: string[]
}
