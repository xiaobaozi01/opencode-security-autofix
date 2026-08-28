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
    input(JSON.stringify({
      scanner: "demo",
      findings: [{ id: "F-1", taxonomies: [{ name: "CWE", id: "CWE-79" }] }],
    }), ".json"),
  )
  assert.equal(result.findings[0].original_id, "F-1")
  assert.deepEqual(result.findings[0].taxonomies, [{
    name: "CWE",
    id: "CWE-79",
    relationship: undefined,
    source: "adapter",
  }])
  assert.equal(result.findings[0].rule?.scanner, "demo")
  assert.equal(result.findings[0].rule?.source, "adapter")
  assert.deepEqual(result.findings[0].raw, {
    id: "F-1",
    taxonomies: [{ name: "CWE", id: "CWE-79" }],
  })
  assert.equal(result.report.scanner, "demo")
})

test("SARIF Adapter 提取规则、位置和 CWE", () => {
  const document = {
    version: "2.1.0",
    runs: [{
      tool: { driver: { name: "demo", rules: [{
        id: "R1",
        properties: { tags: ["security"] },
        relationships: [{
          target: { id: "CWE-89", toolComponent: { index: 0 } },
          kinds: ["equal"],
        }],
      }] } },
      taxonomies: [{ name: "CWE", guid: "cwe-taxonomy" }],
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
  const finding = result.findings[0]
  assert.deepEqual(finding.rule, {
    scanner: "demo",
    rule_id: "R1",
    rule_version: undefined,
    fingerprints: undefined,
    partial_fingerprints: undefined,
    source: "scanner",
  })
  assert.deepEqual(finding.taxonomies, [{
    name: "CWE",
    id: "CWE-89",
    relationship: "equal",
    source: "scanner",
  }])
  assert.deepEqual(finding.location, {
    file: "src/db.ts",
    start_line: 7,
    end_line: undefined,
  })
  assert.equal(finding.title, "SQL injection")
  assert.equal(finding.severity, "error")
  assert.equal(finding.description, "SQL injection")
  assert.deepEqual(finding.raw, document.runs[0].results[0])
})

test("SARIF Adapter 保留全部 full/partial fingerprints", () => {
  const document = {
    version: "2.1.0",
    runs: [{
      tool: { driver: { name: "demo", rules: [{ id: "R1" }] } },
      results: [{
        ruleId: "R1",
        fingerprints: { stable: "full-1", alternate: "full-2" },
        partialFingerprints: { "primaryLocationLineHash/v1": "old", "primaryLocationLineHash/v2": "new" },
      }],
    }],
  }
  const finding = sarifReportAdapter.parse(input(JSON.stringify(document), ".sarif")).findings[0]
  assert.deepEqual(finding.rule?.fingerprints, { stable: "full-1", alternate: "full-2" })
  assert.deepEqual(finding.rule?.partial_fingerprints, {
    "primaryLocationLineHash/v1": "old",
    "primaryLocationLineHash/v2": "new",
  })
})

test("Text Adapter 保留非结构化正文并发出提示", () => {
  const result = textReportAdapter.parse(input("possible issue", ".txt"))
  assert.equal(result.findings[0].description, "possible issue")
  assert.equal(result.warnings.length, 1)
})
