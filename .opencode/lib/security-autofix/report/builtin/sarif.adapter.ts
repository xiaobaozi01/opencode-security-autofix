import type { TaxonomyReference } from "../../finding/types"
import type { ReportAdapter, ReportAdapterInput, ReportEnvelope } from "../types"

function tryJson(text: string): any | undefined {
  try { return JSON.parse(text) } catch { return undefined }
}

function relationshipKind(value: unknown): TaxonomyReference["relationship"] {
  return ["equal", "subset", "superset", "relevant"].includes(String(value))
    ? value as TaxonomyReference["relationship"]
    : "relevant"
}

function taxonomyComponentName(run: any, reference: any) {
  const component = reference?.toolComponent
  if (component?.name) return String(component.name)
  const taxonomies = run.taxonomies ?? []
  if (Number.isInteger(component?.index) && taxonomies[component.index]?.name) {
    return String(taxonomies[component.index].name)
  }
  if (component?.guid) {
    const taxonomy = taxonomies.find((item: any) => item.guid === component.guid)
    if (taxonomy?.name) return String(taxonomy.name)
  }
  return "UNKNOWN"
}

function taxonomyReferences(run: any, result: any, rule: any): TaxonomyReference[] {
  const references: TaxonomyReference[] = []
  for (const tag of rule?.properties?.tags ?? []) {
    const cwe = String(tag).match(/CWE-\d+/i)?.[0]
    if (cwe) references.push({ name: "CWE", id: cwe.toUpperCase(), source: "adapter" })
  }
  for (const taxon of result.taxa ?? []) {
    if (!taxon?.id) continue
    references.push({
      name: taxonomyComponentName(run, taxon),
      id: String(taxon.id),
      relationship: "relevant",
      source: "scanner",
    })
  }
  for (const relationship of rule?.relationships ?? []) {
    const target = relationship?.target
    if (!target?.id) continue
    references.push({
      name: taxonomyComponentName(run, target),
      id: String(target.id),
      relationship: relationshipKind(relationship.kinds?.[0]),
      source: "scanner",
    })
  }
  return references.filter(
    (item, index, all) =>
      all.findIndex(candidate => candidate.name === item.name && candidate.id === item.id) === index,
  )
}

function fingerprint(result: any) {
  const values = Object.values(result.partialFingerprints ?? result.fingerprints ?? {})
  return values.length ? String(values[0]) : undefined
}

function sarifFindings(doc: any) {
  const findings = []
  for (const run of doc.runs ?? []) {
    const driver = run.tool?.driver ?? {}
    const ruleList = driver.rules ?? []
    const rules = new Map(ruleList.map((rule: any) => [rule.id, rule]))
    for (const result of run.results ?? []) {
      const location = result.locations?.[0]?.physicalLocation
      const rule: any = rules.get(result.ruleId) ?? ruleList[result.ruleIndex]
      const ruleId = result.ruleId ?? rule?.id
      findings.push({
        original_id: result.guid ?? result.correlationGuid,
        rule: {
          scanner: driver.name,
          rule_id: ruleId,
          rule_version: driver.semanticVersion ?? driver.version,
          fingerprint: fingerprint(result),
        },
        taxonomies: taxonomyReferences(run, result, rule),
        raw_type: result.properties?.type ?? result.properties?.category,
        title: result.message?.text ?? rule?.shortDescription?.text ?? ruleId,
        severity: result.level,
        location: {
          file: location?.artifactLocation?.uri,
          start_line: location?.region?.startLine,
          end_line: location?.region?.endLine,
        },
        description: result.message?.text,
        raw: result,
      })
    }
  }
  return findings
}

export const sarifReportAdapter: ReportAdapter = {
  id: "sarif",
  priority: 100,
  supports(input: ReportAdapterInput) {
    if (input.formatHint === "sarif" || input.extension === ".sarif") return true
    if (input.extension !== ".json") return false
    const doc = tryJson(input.text)
    return doc?.version === "2.1.0" && Array.isArray(doc?.runs)
  },
  parse(input: ReportAdapterInput): ReportEnvelope {
    const doc = JSON.parse(input.text)
    return {
      report: {
        path: input.filePath,
        format: "sarif",
        scanner: doc?.runs?.[0]?.tool?.driver?.name,
        adapter: "sarif",
      },
      findings: sarifFindings(doc),
      warnings: [],
    }
  },
}
