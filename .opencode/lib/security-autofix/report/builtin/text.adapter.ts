import type { ReportAdapter, ReportAdapterInput, ReportEnvelope } from "../types"

const KNOWN_TEXT_EXTENSIONS = new Set([
  "", ".txt", ".log", ".md", ".markdown", ".out", ".report",
])

const KNOWN_BINARY_EXTENSIONS = new Set([
  ".xlsx", ".xls", ".pdf", ".zip", ".gz", ".7z", ".doc", ".docx",
])

function looksLikeText(input: ReportAdapterInput) {
  if (KNOWN_BINARY_EXTENSIONS.has(input.extension)) return false
  if (KNOWN_TEXT_EXTENSIONS.has(input.extension)) return true
  const sample = input.bytes.subarray(0, Math.min(input.bytes.length, 4096))
  let controls = 0
  for (const b of sample) {
    if (b === 0) return false
    if (b < 9 || (b > 13 && b < 32)) controls++
  }
  return sample.length === 0 || controls / sample.length < 0.02
}

export const textReportAdapter: ReportAdapter = {
  id: "text",
  priority: 0,
  supports(input: ReportAdapterInput) {
    if (["text", "markdown"].includes(input.formatHint)) return true
    return looksLikeText(input)
  },
  parse(input: ReportAdapterInput): ReportEnvelope {
    const markdown = input.formatHint === "markdown" || [".md", ".markdown"].includes(input.extension)
    return {
      report: {
        path: input.filePath,
        format: markdown ? "markdown" : "text",
        adapter: "text",
      },
      findings: [{
        taxonomies: [],
        title: "UNSTRUCTURED_REPORT",
        description: input.text,
        raw: input.text,
      }],
      warnings: ["非结构化报告需要由 report-analyzer 继续进行语义提取"],
    }
  },
}
