import type { ReportAdapter, ReportAdapterInput, ReportEnvelope } from "../types"

function tryJson(text: string): any | undefined {
  try { return JSON.parse(text) } catch { return undefined }
}

function sarifFindings(doc: any) {
  const findings: any[] = []
  for (const run of doc.runs ?? []) {
    const rules = new Map((run.tool?.driver?.rules ?? []).map((r: any) => [r.id, r]))
    for (const result of run.results ?? []) {
      const loc = result.locations?.[0]?.physicalLocation
      const rule: any = rules.get(result.ruleId)
      findings.push({
        original_id: result.guid ?? result.correlationGuid,
        rule: result.ruleId,
        title: result.message?.text ?? rule?.shortDescription?.text ?? result.ruleId,
        severity: result.level,
        file: loc?.artifactLocation?.uri,
        start_line: loc?.region?.startLine,
        end_line: loc?.region?.endLine,
        cwe: rule?.properties?.tags?.find((x: string) => /^CWE-\d+$/i.test(x)),
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
