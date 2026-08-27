import assert from "node:assert/strict"
import test from "node:test"
import { compareBaselineAndRescan } from "../lib/security-autofix/finding/compare.ts"

const finding = (overrides: Record<string, unknown> = {}) => ({
  original_id: "F-1",
  rule: { scanner: "demo", rule_id: "R-1", fingerprint: "stable-fingerprint" },
  location: { file: "src/app.ts", start_line: 10 },
  ...overrides,
})

test("基线复现且稳定 Fingerprint 在重扫中消失才返回 ABSENT", () => {
  const original = finding()
  const result = compareBaselineAndRescan(original, [finding()], [])
  assert.equal(result.baseline.status, "PRESENT")
  assert.equal(result.status, "ABSENT")
})

test("弱 Finding ID 消失不能证明漏洞已修复", () => {
  const original = finding({ rule: { scanner: "demo", rule_id: "R-1" } })
  const result = compareBaselineAndRescan(original, [original], [])
  assert.equal(result.baseline.status, "PRESENT")
  assert.equal(result.status, "INDETERMINATE")
})

test("重扫仍匹配任一确定性身份时返回 PRESENT", () => {
  const original = finding({ id: "internal-before" })
  const changedFingerprint = finding({
    id: "internal-after",
    rule: { scanner: "demo", rule_id: "R-1", fingerprint: "changed" },
  })
  const result = compareBaselineAndRescan(original, [finding()], [changedFingerprint])
  assert.equal(result.status, "PRESENT")
  assert.equal(result.rescan?.identityStrength, "IDENTIFIER")
})

test("修复前基线未复现时结果为 INDETERMINATE", () => {
  const result = compareBaselineAndRescan(finding(), [], [])
  assert.equal(result.status, "INDETERMINATE")
})
