import { listRepairEntries } from "../repair/catalog.ts"
import type {
  ClassificationCandidate,
  ClassificationConfidence,
  ClassificationInput,
  ClassificationMatchKind,
  FindingClassification,
} from "./types"

interface ScoredCandidate extends ClassificationCandidate {
  score: number
  priority: number
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

function confidenceScore(confidence: ClassificationConfidence) {
  return confidence === "HIGH" ? 45 : confidence === "MEDIUM" ? 35 : 25
}

function addCandidate(
  candidates: Map<string, ScoredCandidate>,
  entry: ReturnType<typeof listRepairEntries>[number],
  score: number,
  confidence: ClassificationConfidence,
  matchedBy: ClassificationMatchKind,
  evidence: string[],
) {
  const current = candidates.get(entry.id)
  if (!current || score > current.score) {
    candidates.set(entry.id, {
      repair_entry_id: entry.id,
      display_type: entry.display_type,
      confidence,
      matched_by: matchedBy,
      evidence: [...new Set(evidence)],
      score,
      priority: entry.priority,
    })
  } else if (score === current.score) {
    current.evidence = [...new Set([...current.evidence, ...evidence])]
  }
}

export function listSupportedDisplayTypes() {
  return [...new Set(listRepairEntries().map(entry => entry.display_type))].sort()
}

export function classifyFinding(input: ClassificationInput): FindingClassification {
  const candidates = new Map<string, ScoredCandidate>()
  const scanner = input.rule?.scanner?.trim().toLowerCase()
  const ruleId = input.rule?.rule_id?.trim().toLowerCase()
  const rawType = normalizedLabel(input.raw_type)
  const taxonomies = input.taxonomies ?? []

  for (const entry of listRepairEntries()) {
    const matchers = entry.matchers ?? {}

    const scannerRule = matchers.scanner_rules?.find(
      matcher =>
        scanner &&
        ruleId &&
        matcher.scanner.trim().toLowerCase() === scanner &&
        matcher.rule_id.trim().toLowerCase() === ruleId,
    )
    if (scannerRule) {
      addCandidate(
        candidates,
        entry,
        100,
        "HIGH",
        "SCANNER_RULE",
        [`${input.rule?.scanner}:${input.rule?.rule_id}`],
      )
    }

    const taxonomyMatches = taxonomies.filter(taxonomy =>
      matchers.taxonomies?.some(
        matcher =>
          normalizedTaxonomy(matcher.name) === normalizedTaxonomy(taxonomy.name) &&
          normalizedTaxonomy(matcher.id) === normalizedTaxonomy(taxonomy.id),
      ),
    )
    if (taxonomyMatches.length) {
      addCandidate(
        candidates,
        entry,
        80,
        "HIGH",
        "TAXONOMY",
        taxonomyMatches.map(item => `${item.name}:${item.id}`),
      )
    }

    if (
      rawType &&
      rawType !== "OTHER" &&
      matchers.aliases?.some(alias => normalizedLabel(alias) === rawType)
    ) {
      addCandidate(candidates, entry, 60, "HIGH", "ALIAS", [`raw_type:${input.raw_type}`])
    }

    for (const semantic of input.semantic_candidates ?? []) {
      const semanticType = normalizedLabel(semantic.display_type)
      if (!matchers.aliases?.some(alias => normalizedLabel(alias) === semanticType)) continue
      addCandidate(
        candidates,
        entry,
        confidenceScore(semantic.confidence),
        semantic.confidence,
        "SEMANTIC",
        semantic.evidence ?? [`semantic:${semantic.display_type}`],
      )
    }
  }

  const ordered = [...candidates.values()].sort(
    (a, b) => b.score - a.score || b.priority - a.priority || a.repair_entry_id.localeCompare(b.repair_entry_id),
  )
  const publicCandidates = ordered.map(({ score: _score, priority: _priority, ...candidate }) => candidate)

  if (!ordered.length) {
    const hasClassificationEvidence = Boolean(
      (rawType && rawType !== "OTHER") ||
        taxonomies.length ||
        (input.rule?.scanner && input.rule?.rule_id) ||
        input.semantic_candidates?.length,
    )
    return {
      status: hasClassificationEvidence ? "NOT_SUPPORTED" : "UNCLASSIFIED",
      candidates: [],
      reason: hasClassificationEvidence
        ? "现有 Repair Matcher 无法匹配 Finding 证据"
        : "Finding 缺少可用于确定性分类的 Rule、Taxonomy 或类型证据",
    }
  }

  const top = ordered[0]
  const tied = ordered.filter(candidate => candidate.score === top.score)
  if (tied.length > 1) {
    return {
      status: "AMBIGUOUS",
      candidates: publicCandidates,
      reason: "多个 Repair Entry 以相同证据强度匹配当前 Finding",
    }
  }

  if (top.matched_by === "SEMANTIC") {
    return {
      status: "HUMAN_REVIEW",
      candidates: publicCandidates,
      reason: "仅有 Agent 语义候选，不能自动决定 Repair 路由",
    }
  }

  const { score: _score, priority: _priority, ...selected } = top
  return { status: "MATCHED", candidates: publicCandidates, selected }
}
