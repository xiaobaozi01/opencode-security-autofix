import {
  listRepairEntries,
  repairEntrySupports,
  type RepairEntry,
} from "./catalog.ts"
import type {
  RuleIdentity,
  SemanticRouteCandidate,
  TaxonomyReference,
} from "../finding/types"

export type RepairRouteStatus =
  | "MATCHED"
  | "AMBIGUOUS"
  | "UNCLASSIFIED"
  | "NOT_SUPPORTED"
  | "HUMAN_REVIEW"

export type RepairMatchKind = "SCANNER_RULE" | "TAXONOMY" | "ALIAS" | "SEMANTIC"

export interface RepairRouteInput {
  rule?: RuleIdentity
  taxonomies?: TaxonomyReference[]
  raw_type?: string
  semantic_candidates?: SemanticRouteCandidate[]
  language?: string
  framework?: string
}

export interface RepairRouteCandidate {
  repair_entry_id: string
  display_type: string
  matched_by: RepairMatchKind
  evidence: string[]
}

export interface RepairRouteResult {
  status: RepairRouteStatus
  candidates: RepairRouteCandidate[]
  reason?: string
  repair_entry_id?: string
  display_type?: string
  name_zh?: string
  repair_provider?: string
  strategy?: string
  default_fixability?: RepairEntry["default_fixability"]
  validators?: string[]
  supported_languages?: string[]
  supported_frameworks?: string[]
}

interface EntryMatch {
  entry: RepairEntry
  evidence: string[]
}

function normalizedLabel(value: string | undefined) {
  return value
    ?.trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function normalizedTaxonomy(value: string | undefined) {
  return value?.trim().toUpperCase()
}

function collectMatches(
  entries: RepairEntry[],
  evidenceFor: (entry: RepairEntry) => string[],
): EntryMatch[] {
  return entries
    .map(entry => ({ entry, evidence: [...new Set(evidenceFor(entry))] }))
    .filter(match => match.evidence.length > 0)
}

function candidates(matches: EntryMatch[], matchedBy: RepairMatchKind): RepairRouteCandidate[] {
  return matches.map(match => ({
    repair_entry_id: match.entry.id,
    display_type: match.entry.display_type,
    matched_by: matchedBy,
    evidence: match.evidence,
  }))
}

function deterministicResult(
  matches: EntryMatch[],
  matchedBy: Exclude<RepairMatchKind, "SEMANTIC">,
  input: RepairRouteInput,
): RepairRouteResult {
  const routeCandidates = candidates(matches, matchedBy)
  const applicable = matches.filter(match =>
    repairEntrySupports(match.entry, input.language, input.framework),
  )

  if (!applicable.length) {
    return {
      status: "NOT_SUPPORTED",
      candidates: routeCandidates,
      reason: "最强证据命中的 Repair Entry 不支持已确认的语言或框架",
    }
  }

  if (applicable.length > 1) {
    return {
      status: "AMBIGUOUS",
      candidates: candidates(applicable, matchedBy),
      reason: "同一级确定性证据匹配多个适用的 Repair Entry",
    }
  }

  const entry = applicable[0].entry
  return {
    status: "MATCHED",
    candidates: routeCandidates,
    repair_entry_id: entry.id,
    display_type: entry.display_type,
    name_zh: entry.name_zh,
    repair_provider: entry.provider,
    strategy: entry.strategy,
    default_fixability: entry.default_fixability,
    validators: entry.validators,
    supported_languages: entry.supported_languages,
    supported_frameworks: entry.supported_frameworks,
  }
}

export function routeFinding(input: RepairRouteInput): RepairRouteResult {
  const entries = listRepairEntries()
  const scanner = input.rule?.scanner?.trim().toLowerCase()
  const ruleId = input.rule?.rule_id?.trim().toLowerCase()

  if (scanner && ruleId) {
    const matches = collectMatches(entries, entry =>
      entry.matchers?.scanner_rules
        ?.filter(matcher =>
          matcher.scanner.trim().toLowerCase() === scanner &&
          matcher.rule_id.trim().toLowerCase() === ruleId,
        )
        .map(() => `${input.rule?.scanner}:${input.rule?.rule_id}`) ?? [],
    )
    if (matches.length) return deterministicResult(matches, "SCANNER_RULE", input)
  }

  if (input.taxonomies?.length) {
    const matches = collectMatches(entries, entry =>
      input.taxonomies
        ?.filter(taxonomy => entry.matchers?.taxonomies?.some(matcher =>
          normalizedTaxonomy(matcher.name) === normalizedTaxonomy(taxonomy.name) &&
          normalizedTaxonomy(matcher.id) === normalizedTaxonomy(taxonomy.id),
        ))
        .map(taxonomy => `${taxonomy.name}:${taxonomy.id}`) ?? [],
    )
    if (matches.length) return deterministicResult(matches, "TAXONOMY", input)
  }

  const rawType = normalizedLabel(input.raw_type)
  if (rawType && rawType !== "OTHER") {
    const matches = collectMatches(entries, entry =>
      entry.matchers?.aliases?.some(alias => normalizedLabel(alias) === rawType)
        ? [`raw_type:${input.raw_type}`]
        : [],
    )
    if (matches.length) return deterministicResult(matches, "ALIAS", input)
  }

  if (input.semantic_candidates?.length) {
    const matches = collectMatches(entries, entry =>
      input.semantic_candidates
        ?.filter(candidate => entry.matchers?.aliases?.some(
          alias => normalizedLabel(alias) === normalizedLabel(candidate.display_type),
        ))
        .flatMap(candidate => candidate.evidence ?? [`semantic:${candidate.display_type}`]) ?? [],
    )
    if (matches.length) {
      const applicable = matches.filter(match =>
        repairEntrySupports(match.entry, input.language, input.framework),
      )
      return applicable.length
        ? {
            status: "HUMAN_REVIEW",
            candidates: candidates(applicable, "SEMANTIC"),
            reason: "只有模型语义候选，必须由人工确认后才能选择 Repair Entry",
          }
        : {
            status: "NOT_SUPPORTED",
            candidates: candidates(matches, "SEMANTIC"),
            reason: "语义候选对应的 Repair Entry 不支持已确认的语言或框架",
          }
    }
  }

  const hasEvidence = Boolean(
    (scanner && ruleId) ||
      input.taxonomies?.length ||
      (rawType && rawType !== "OTHER") ||
      input.semantic_candidates?.length,
  )
  return {
    status: hasEvidence ? "NOT_SUPPORTED" : "UNCLASSIFIED",
    candidates: [],
    reason: hasEvidence
      ? "Repair Catalog 中没有匹配当前 Finding 证据的 Entry"
      : "缺少 Rule、Taxonomy、原始类型或语义候选",
  }
}
