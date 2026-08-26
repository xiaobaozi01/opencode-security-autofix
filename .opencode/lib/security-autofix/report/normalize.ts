import type { TaxonomyReference } from "../classification/types"
import type { RawFinding } from "./types"

function first(raw: Record<string, any>, names: string[]) {
  for (const name of names) {
    const direct = raw[name]
    if (direct !== undefined && direct !== null && direct !== "") return direct
    const key = Object.keys(raw).find(item => item.toLowerCase() === name.toLowerCase())
    if (key && raw[key] !== undefined && raw[key] !== null && raw[key] !== "") return raw[key]
  }
  return undefined
}

function number(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function relationship(value: unknown): TaxonomyReference["relationship"] {
  return ["equal", "subset", "superset", "relevant"].includes(String(value))
    ? value as TaxonomyReference["relationship"]
    : undefined
}

function taxonomySource(value: unknown): TaxonomyReference["source"] {
  return ["scanner", "adapter", "classifier"].includes(String(value))
    ? value as TaxonomyReference["source"]
    : "scanner"
}

function taxonomyReferences(raw: Record<string, any>): TaxonomyReference[] {
  const result: TaxonomyReference[] = []
  const cwes = first(raw, ["cwe", "cwes", "cwe_id", "cweId"])
  const values = Array.isArray(cwes) ? cwes : cwes ? [cwes] : []
  for (const value of values) {
    const match = String(value).match(/CWE-\d+/i)
    if (match) result.push({ name: "CWE", id: match[0].toUpperCase(), source: "adapter" })
  }

  for (const taxonomy of Array.isArray(raw.taxonomies) ? raw.taxonomies : []) {
    if (!taxonomy?.name || !taxonomy?.id) continue
    result.push({
      name: String(taxonomy.name),
      id: String(taxonomy.id),
      relationship: relationship(taxonomy.relationship),
      source: taxonomySource(taxonomy.source),
    })
  }

  return result.filter(
    (item, index, all) =>
      all.findIndex(candidate => candidate.name === item.name && candidate.id === item.id) === index,
  )
}

export function normalizeRawFinding(rawValue: unknown, scanner?: string): RawFinding {
  const raw = rawValue && typeof rawValue === "object"
    ? rawValue as Record<string, any>
    : { value: rawValue }
  const rawRule = first(raw, ["rule", "ruleId", "rule_id", "check_id", "checkId"])
  const ruleObject = rawRule && typeof rawRule === "object" ? rawRule : undefined
  const scannerName =
    scanner ??
    (typeof raw.scanner === "string" ? raw.scanner : raw.scanner?.name) ??
    ruleObject?.scanner
  const ruleId =
    ruleObject?.rule_id ??
    ruleObject?.id ??
    (rawRule && typeof rawRule !== "object" ? rawRule : undefined)
  const file = first(raw, ["file", "path", "filename", "uri"])
  const startLine = first(raw, ["start_line", "startLine", "line", "line_number"])
  const endLine = first(raw, ["end_line", "endLine"])

  return {
    original_id: String(first(raw, ["original_id", "id", "finding_id", "findingId"]) ?? "") || undefined,
    rule:
      scannerName || ruleId
        ? {
            scanner: scannerName ? String(scannerName) : undefined,
            rule_id: ruleId ? String(ruleId) : undefined,
            rule_version: ruleObject?.rule_version ?? ruleObject?.version,
            fingerprint: first(raw, ["fingerprint", "hash"]),
          }
        : undefined,
    taxonomies: taxonomyReferences(raw),
    raw_type: String(first(raw, ["raw_type", "type", "category", "kind"]) ?? "") || undefined,
    title: String(first(raw, ["title", "name", "message"]) ?? "") || undefined,
    description: String(first(raw, ["description", "detail", "message"]) ?? "") || undefined,
    severity: String(first(raw, ["severity", "level"]) ?? "") || undefined,
    location:
      file || startLine || endLine
        ? {
            file: file ? String(file) : undefined,
            start_line: number(startLine),
            end_line: number(endLine),
          }
        : undefined,
    raw: rawValue,
  }
}
