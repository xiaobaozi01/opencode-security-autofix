import assert from "node:assert/strict"
import test from "node:test"
import { compareBaselineAndRescan } from "../lib/security-autofix/finding/compare.ts"
import { findingIdentityKeys } from "../lib/security-autofix/finding/identity.ts"

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

test("SARIF 多版本 partial fingerprint 使用双方共有版本匹配", () => {
  const original = finding({
    rule: {
      scanner: "demo",
      rule_id: "R-1",
      partial_fingerprints: { "lineHash/v1": "old", "lineHash/v2": "shared" },
    },
  })
  const rescan = finding({
    original_id: "F-2",
    rule: {
      scanner: "demo",
      rule_id: "R-1",
      partial_fingerprints: { "lineHash/v2": "shared", "lineHash/v3": "future" },
    },
  })
  assert.equal(compareBaselineAndRescan(original, [original], [rescan]).status, "PRESENT")
})

test("Finding 文件路径只在 Windows 下折叠大小写", () => {
  const upper = finding({
    original_id: undefined,
    rule: { scanner: "demo", rule_id: "R-1" },
    location: { file: "Src/App.ts", start_line: 10 },
  })
  const lower = finding({
    original_id: undefined,
    rule: { scanner: "demo", rule_id: "R-1" },
    location: { file: "src/app.ts", start_line: 10 },
  })
  assert.notEqual(findingIdentityKeys(upper, "linux").location, findingIdentityKeys(lower, "linux").location)
  assert.equal(findingIdentityKeys(upper, "win32").location, findingIdentityKeys(lower, "win32").location)
})
