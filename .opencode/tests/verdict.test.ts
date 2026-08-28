import assert from "node:assert/strict"
import test from "node:test"
import { validateFinalFinding, validateFinalReport } from "../lib/security-autofix/workflow/verdict.ts"

function acceptedFinding() {
  return {
    id: "F-1",
    analysis_verdict: "VULNERABLE",
    analysis_confidence: "HIGH",
    verdict: "FIX_ACCEPTED",
    route: { status: "MATCHED" },
    patch_batch: { status: "ACCEPTED" },
    rescan_comparison_id: "comparison-test",
    gates: {
      analysis: "PASS",
      patch: "PASS",
      security_review: "PASS",
      build: "PASS",
      tests: "PASS",
      rescan: "ABSENT",
      regression_review: "PASS",
    },
  }
}

test("所有必要 Gate 通过且 Patch 已接受时允许 FIX_ACCEPTED", () => {
  assert.deepEqual(validateFinalFinding(acceptedFinding(), 0), [])
})

test("NOT_RUN 或 INDETERMINATE 不能包装成 FIX_ACCEPTED", () => {
  for (const value of ["NOT_RUN", "INDETERMINATE"]) {
    const finding = acceptedFinding()
    finding.gates.rescan = value
    assert.ok(validateFinalFinding(finding, 0).some(error => error.includes("FIX_ACCEPTED")))
  }
})

test("任一必要 Gate 失败时必须 FIX_REJECTED", () => {
  const finding = acceptedFinding()
  finding.gates.tests = "FAIL"
  finding.patch_batch.status = "ROLLED_BACK"
  assert.ok(validateFinalFinding(finding, 0).some(error => error.includes("FIX_REJECTED")))
  finding.verdict = "FIX_REJECTED"
  assert.deepEqual(validateFinalFinding(finding, 0), [])
})

test("NOT_VULNERABLE 必须归类为 FALSE_POSITIVE", () => {
  const finding = {
    id: "F-2",
    analysis_verdict: "NOT_VULNERABLE",
    analysis_confidence: "HIGH",
    verdict: "HUMAN_REVIEW",
  }
  assert.ok(validateFinalFinding(finding, 0).some(error => error.includes("FALSE_POSITIVE")))
  finding.verdict = "FALSE_POSITIVE"
  assert.deepEqual(validateFinalFinding(finding, 0), [])
})

test("被拒绝的已应用 Patch 必须回滚", () => {
  const finding = acceptedFinding()
  finding.verdict = "FIX_REJECTED"
  finding.gates.security_review = "FAIL"
  finding.patch_batch.status = "SEALED"
  assert.ok(validateFinalFinding(finding, 0).some(error => error.includes("回滚")))
  finding.patch_batch.status = "ROLLED_BACK"
  assert.deepEqual(validateFinalFinding(finding, 0), [])
})

test("VERIFY 模式允许验证已有补丁而不伪造 Patch Batch", () => {
  const finding = acceptedFinding()
  finding.patch_batch.status = "EXISTING"
  finding.verification_baseline = "historical-scan.sarif"
  assert.deepEqual(validateFinalFinding(finding, 0, "VERIFY"), [])
  assert.ok(validateFinalFinding(finding, 0, "AUTOFIX").length > 0)
})

test("未知或缺失 verdict 不能被静默放行", () => {
  const finding = acceptedFinding()
  finding.verdict = "LOOKS_GOOD"
  assert.ok(validateFinalFinding(finding, 0).some(error => error.includes("verdict 必须")))
  delete (finding as any).verdict
  ;(finding as any).fixability = "FIX_ACCEPTED"
  assert.ok(validateFinalFinding(finding, 0).some(error => error.includes("verdict 必须")))
})

test("建议类结论不能携带已接受的补丁", () => {
  const finding = acceptedFinding()
  finding.verdict = "GUIDANCE_ONLY"
  assert.ok(validateFinalFinding(finding, 0).some(error => error.includes("不得保留")))
})

test("VERIFY 接受结论必须引用独立历史 baseline", () => {
  const finding = acceptedFinding()
  finding.patch_batch.status = "EXISTING"
  assert.ok(validateFinalFinding(finding, 0, "VERIFY").some(error => error.includes("历史 baseline")))
})

test("最终报告必须显式声明受支持的工作流模式", () => {
  assert.ok(validateFinalReport({ findings: [acceptedFinding()] }).some(error => error.includes("task.mode")))
  assert.deepEqual(validateFinalReport({ task: { mode: "AUTOFIX" }, findings: [acceptedFinding()] }), [])
})
