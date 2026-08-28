import assert from "node:assert/strict"
import test from "node:test"
import { routeFinding } from "../lib/security-autofix/repair/router.ts"

test("Scanner Rule 是最高优先级的确定性路由证据", () => {
  const result = routeFinding({
    analysis_verdict: "VULNERABLE",
    analysis_confidence: "HIGH",
    rule: { scanner: "CodeQL", rule_id: "java/sql-injection", source: "scanner" },
    taxonomies: [{ name: "CWE", id: "CWE-79", source: "scanner" }],
    language: "Java",
  })
  assert.equal(result.status, "MATCHED")
  assert.equal(result.repair_entry_id, "sql-injection.generic")
  assert.equal(result.candidates[0]?.matched_by, "SCANNER_RULE")
  assert.equal(result.repair_provider, "fix-injection")
  assert.equal(result.strategy, "sql-injection")
})

test("CWE Taxonomy 可以直接返回 Repair Provider", () => {
  const result = routeFinding({
    analysis_verdict: "VULNERABLE",
    analysis_confidence: "HIGH",
    taxonomies: [{ name: "CWE", id: "CWE-79", relationship: "equal", source: "adapter" }],
    language: "TypeScript",
  })
  assert.equal(result.status, "MATCHED")
  assert.equal(result.display_type, "XSS")
  assert.equal(result.repair_provider, "fix-web-security")
})

test("扫描器原始别名使用 Catalog 白名单路由", () => {
  const result = routeFinding({
    analysis_verdict: "VULNERABLE",
    analysis_confidence: "HIGH",
    raw_type: "cross-site scripting",
    raw_type_source: "scanner",
    language: "JavaScript",
  })
  assert.equal(result.status, "MATCHED")
  assert.equal(result.display_type, "XSS")
  assert.equal(result.candidates[0]?.matched_by, "ALIAS")
})

test("一个 Taxonomy 对应多个适用策略时返回 AMBIGUOUS", () => {
  const result = routeFinding({
    analysis_verdict: "VULNERABLE",
    analysis_confidence: "HIGH",
    taxonomies: [{ name: "CWE", id: "CWE-22", source: "scanner" }],
    language: "Java",
  })
  assert.equal(result.status, "AMBIGUOUS")
  assert.deepEqual(
    new Set(result.candidates.map(candidate => candidate.display_type)),
    new Set(["PATH_TRAVERSAL", "ZIP_SLIP"]),
  )
})

test("只有模型语义候选时强制 HUMAN_REVIEW", () => {
  const result = routeFinding({
    analysis_verdict: "VULNERABLE",
    analysis_confidence: "HIGH",
    semantic_candidates: [{
      display_type: "SERVER_SIDE_REQUEST_FORGERY",
      confidence: "HIGH",
      evidence: ["URL input reaches outbound HTTP client"],
    }],
    language: "Java",
  })
  assert.equal(result.status, "HUMAN_REVIEW")
  assert.equal(result.repair_entry_id, undefined)
  assert.equal(result.candidates[0]?.display_type, "SSRF")
})

test("缺少证据和存在未知证据使用不同状态", () => {
  assert.equal(routeFinding({ analysis_verdict: "VULNERABLE", analysis_confidence: "HIGH", language: "Java" }).status, "UNCLASSIFIED")
  assert.equal(routeFinding({
    analysis_verdict: "VULNERABLE",
    analysis_confidence: "HIGH",
    raw_type: "UNKNOWN_COMPANY_RULE",
    raw_type_source: "scanner",
    language: "Java",
  }).status, "NOT_SUPPORTED")
})

test("路由时规范化常见语言别名", () => {
  assert.equal(
    routeFinding({ analysis_verdict: "VULNERABLE", analysis_confidence: "HIGH", raw_type: "SQL_INJECTION", raw_type_source: "scanner", language: "Node.js" }).status,
    "MATCHED",
  )
  assert.equal(
    routeFinding({ analysis_verdict: "VULNERABLE", analysis_confidence: "HIGH", raw_type: "SQL_INJECTION", raw_type_source: "scanner", language: "Rust" }).status,
    "NOT_SUPPORTED",
  )
})

test("路由时规范化常见框架别名", () => {
  const result = routeFinding({
    analysis_verdict: "VULNERABLE",
    analysis_confidence: "HIGH",
    raw_type: "JWT_SECURITY",
    raw_type_source: "scanner",
    language: "Java",
    framework: "Spring Security",
  })
  assert.equal(result.status, "MATCHED")
  assert.equal(result.repair_entry_id, "jwt-security.generic")
})

test("高优先级证据命中但不适用时不回退到弱证据", () => {
  const result = routeFinding({
    analysis_verdict: "VULNERABLE",
    analysis_confidence: "HIGH",
    rule: { scanner: "CodeQL", rule_id: "java/sql-injection", source: "scanner" },
    taxonomies: [{ name: "CWE", id: "CWE-79", source: "scanner" }],
    language: "Rust",
  })
  assert.equal(result.status, "NOT_SUPPORTED")
  assert.equal(result.candidates[0]?.display_type, "SQL_INJECTION")
})

test("真实性结论是自动修复硬门禁", () => {
  assert.equal(routeFinding({
    analysis_verdict: "NOT_VULNERABLE",
    analysis_confidence: "HIGH",
    raw_type: "SQL_INJECTION",
    language: "Java",
  }).status, "FALSE_POSITIVE")
  assert.equal(routeFinding({
    analysis_verdict: "NEED_CONTEXT",
    analysis_confidence: "HIGH",
    raw_type: "SQL_INJECTION",
    language: "Java",
  }).status, "HUMAN_REVIEW")
})

test("Analyzer 或非精确 Taxonomy 不能确定性路由", () => {
  for (const taxonomy of [
    { name: "CWE", id: "CWE-79", relationship: "equal" as const, source: "analyzer" as const },
    { name: "CWE", id: "CWE-79", relationship: "relevant" as const, source: "scanner" as const },
    { name: "CWE", id: "CWE-79", relationship: "superset" as const, source: "adapter" as const },
  ]) {
    const result = routeFinding({
      analysis_verdict: "VULNERABLE",
      analysis_confidence: "HIGH",
      taxonomies: [taxonomy],
      language: "TypeScript",
    })
    assert.equal(result.status, "HUMAN_REVIEW")
    assert.equal(result.repair_entry_id, undefined)
  }
})

test("语言事实未知时不能自动确认 Repair Entry 适用性", () => {
  const result = routeFinding({
    analysis_verdict: "VULNERABLE",
    analysis_confidence: "HIGH",
    raw_type: "SQL_INJECTION",
    raw_type_source: "scanner",
  })
  assert.equal(result.status, "HUMAN_REVIEW")
  assert.equal(result.repair_entry_id, undefined)
})

test("低置信度分析和非扫描器别名都不能触发自动修复", () => {
  assert.equal(routeFinding({
    analysis_verdict: "VULNERABLE",
    analysis_confidence: "MEDIUM",
    raw_type: "SQL_INJECTION",
    raw_type_source: "scanner",
    language: "Java",
  }).status, "HUMAN_REVIEW")
  assert.equal(routeFinding({
    analysis_verdict: "VULNERABLE",
    analysis_confidence: "HIGH",
    raw_type: "SQL_INJECTION",
    raw_type_source: "analyzer",
    language: "Java",
  }).status, "HUMAN_REVIEW")
  assert.equal(routeFinding({
    analysis_verdict: "NOT_VULNERABLE",
    analysis_confidence: "LOW",
  }).status, "HUMAN_REVIEW")
})
