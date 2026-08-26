export type ClassificationStatus =
  | "MATCHED"
  | "AMBIGUOUS"
  | "UNCLASSIFIED"
  | "NOT_SUPPORTED"
  | "HUMAN_REVIEW"

export type ClassificationConfidence = "HIGH" | "MEDIUM" | "LOW"

export type ClassificationMatchKind =
  | "SCANNER_RULE"
  | "TAXONOMY"
  | "ALIAS"
  | "SEMANTIC"

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
  source: "scanner" | "adapter" | "classifier"
}

export interface SemanticClassificationCandidate {
  display_type: string
  confidence: ClassificationConfidence
  evidence?: string[]
}

export interface ClassificationInput {
  rule?: RuleIdentity
  taxonomies?: TaxonomyReference[]
  raw_type?: string
  semantic_candidates?: SemanticClassificationCandidate[]
}

export interface ClassificationCandidate {
  repair_entry_id: string
  display_type: string
  confidence: ClassificationConfidence
  matched_by: ClassificationMatchKind
  evidence: string[]
}

export interface FindingClassification {
  status: ClassificationStatus
  candidates: ClassificationCandidate[]
  selected?: ClassificationCandidate
  reason?: string
}
