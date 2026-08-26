import assert from "node:assert/strict"
import test from "node:test"
import { classifyFinding } from "../lib/security-autofix/classification/registry.ts"

test("Scanner Rule 精确匹配优先选择 Repair Entry", () => {
  const result = classifyFinding({
    rule: { scanner: "CodeQL", rule_id: "java/sql-injection" },
    taxonomies: [{ name: "CWE", id: "CWE-89", source: "scanner" }],
  })
  assert.equal(result.status, "MATCHED")
  assert.equal(result.selected?.repair_entry_id, "sql-injection.generic")
  assert.equal(result.selected?.matched_by, "SCANNER_RULE")
})

test("CWE Taxonomy 可以确定性匹配 Repair Entry", () => {
  const result = classifyFinding({
    taxonomies: [{ name: "CWE", id: "CWE-79", source: "adapter" }],
  })
  assert.equal(result.status, "MATCHED")
  assert.equal(result.selected?.display_type, "XSS")
  assert.equal(result.selected?.matched_by, "TAXONOMY")
})

test("扫描器原始别名会规范到 Catalog display_type", () => {
  const result = classifyFinding({ raw_type: "cross-site scripting" })
  assert.equal(result.status, "MATCHED")
  assert.equal(result.selected?.display_type, "XSS")
  assert.equal(result.selected?.matched_by, "ALIAS")
})

test("一个 Taxonomy 对应多个修复策略时返回 AMBIGUOUS", () => {
  const result = classifyFinding({
    taxonomies: [{ name: "CWE", id: "CWE-22", source: "scanner" }],
  })
  assert.equal(result.status, "AMBIGUOUS")
  assert.deepEqual(
    new Set(result.candidates.map(candidate => candidate.display_type)),
    new Set(["PATH_TRAVERSAL", "ZIP_SLIP"]),
  )
})

test("仅有 Agent 语义候选时强制 HUMAN_REVIEW", () => {
  const result = classifyFinding({
    semantic_candidates: [{
      display_type: "SERVER_SIDE_REQUEST_FORGERY",
      confidence: "HIGH",
      evidence: ["URL input reaches outbound HTTP client"],
    }],
  })
  assert.equal(result.status, "HUMAN_REVIEW")
  assert.equal(result.selected, undefined)
  assert.equal(result.candidates[0]?.display_type, "SSRF")
})

test("缺少证据和存在未知证据使用不同状态", () => {
  assert.equal(classifyFinding({}).status, "UNCLASSIFIED")
  assert.equal(classifyFinding({ raw_type: "UNKNOWN_COMPANY_RULE" }).status, "NOT_SUPPORTED")
})
