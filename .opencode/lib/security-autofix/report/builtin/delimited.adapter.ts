import type { ReportAdapter, ReportAdapterInput, ReportEnvelope } from "../types"
import { normalizeRawFinding } from "../normalize.ts"

export function parseDelimited(text: string, delimiter: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false

  const finishCell = () => {
    row.push(cell)
    cell = ""
  }
  const finishRow = () => {
    finishCell()
    if (row.some(value => value !== "")) rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"'
        i++
      } else {
        quoted = !quoted
      }
    } else if (char === delimiter && !quoted) {
      finishCell()
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++
      finishRow()
    } else {
      cell += char
    }
  }

  if (quoted) throw new Error("CSV/TSV 报告包含未闭合的引号字段")
  if (cell !== "" || row.length > 0) finishRow()
  if (!rows.length) return []

  const headers = rows[0].map((value, index) =>
    (index === 0 ? value.replace(/^\uFEFF/, "") : value).trim(),
  )
  return rows.slice(1).map(cells =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])),
  )
}

export const delimitedReportAdapter: ReportAdapter = {
  id: "delimited",
  priority: 70,
  supports(input: ReportAdapterInput) {
    return ["csv", "tsv"].includes(input.formatHint) || [".csv", ".tsv"].includes(input.extension)
  },
  parse(input: ReportAdapterInput): ReportEnvelope {
    const tsv = input.formatHint === "tsv" || input.extension === ".tsv"
    return {
      report: {
        path: input.filePath,
        format: tsv ? "tsv" : "csv",
        adapter: "delimited",
      },
      findings: parseDelimited(input.text, tsv ? "\t" : ",").map(row => normalizeRawFinding(row)),
      warnings: [],
    }
  },
}
