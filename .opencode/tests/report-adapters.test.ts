import assert from "node:assert/strict"
import test from "node:test"
import { jsonReportAdapter } from "../lib/security-autofix/report/builtin/json.adapter.ts"
import { sarifReportAdapter } from "../lib/security-autofix/report/builtin/sarif.adapter.ts"
import { textReportAdapter } from "../lib/security-autofix/report/builtin/text.adapter.ts"

function input(text: string, extension: string, formatHint = "auto") {
  const bytes = new TextEncoder().encode(text)
  return {
    filePath: `report${extension}`,
    absolutePath: `/workspace/report${extension}`,
    extension,
    formatHint,
    bytes,
    text,
  }
}

test("JSON Adapter 识别常见 findings 容器", () => {
  const result = jsonReportAdapter.parse(
    input(JSON.stringify({ scanner: "demo", findings: [{ id: "F-1" }] }), ".json"),
  )
  assert.deepEqual(result.findings, [{ id: "F-1" }])
  assert.equal(result.report.scanner, "demo")
})

test("SARIF Adapter 提取规则、位置和 CWE", () => {
  const document = {
    version: "2.1.0",
    runs: [{
      tool: { driver: { name: "demo", rules: [{ id: "R1", properties: { tags: ["CWE-89"] } }] } },
      results: [{
        ruleId: "R1",
        level: "error",
        message: { text: "SQL injection" },
        locations: [{ physicalLocation: { artifactLocation: { uri: "src/db.ts" }, region: { startLine: 7 } } }],
      }],
    }],
  }
  const result = sarifReportAdapter.parse(input(JSON.stringify(document), ".sarif"))
  assert.equal(result.report.scanner, "demo")
  assert.deepEqual(result.findings[0], {
    original_id: undefined,
    rule: "R1",
    title: "SQL injection",
    severity: "error",
    file: "src/db.ts",
    start_line: 7,
    end_line: undefined,
    cwe: "CWE-89",
    description: "SQL injection",
    raw: document.runs[0].results[0],
  })
})

test("Text Adapter 保留非结构化正文并发出提示", () => {
  const result = textReportAdapter.parse(input("possible issue", ".txt"))
  assert.equal(result.findings[0].description, "possible issue")
  assert.equal(result.warnings.length, 1)
})
