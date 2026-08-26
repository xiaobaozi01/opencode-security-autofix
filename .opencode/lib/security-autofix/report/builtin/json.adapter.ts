import type { ReportAdapter, ReportAdapterInput, ReportEnvelope } from "../types"
import { normalizeRawFinding } from "../normalize.ts"

export const jsonReportAdapter: ReportAdapter = {
  id: "json",
  priority: 80,
  supports(input: ReportAdapterInput) {
    return input.formatHint === "json" || input.extension === ".json"
  },
  parse(input: ReportAdapterInput): ReportEnvelope {
    const raw = JSON.parse(input.text)
    let findings: any[]
    if (Array.isArray(raw)) findings = raw
    else if (Array.isArray(raw?.findings)) findings = raw.findings
    else if (Array.isArray(raw?.vulnerabilities)) findings = raw.vulnerabilities
    else if (Array.isArray(raw?.results)) findings = raw.results
    else findings = [raw]

    return {
      report: {
        path: input.filePath,
        format: "json",
        scanner: raw?.scanner,
        adapter: "json",
      },
      findings: findings.map(finding => normalizeRawFinding(finding, raw?.scanner)),
      warnings: [],
    }
  },
}
