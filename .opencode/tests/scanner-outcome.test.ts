import assert from "node:assert/strict"
import test from "node:test"
import { classifyScanOutcome } from "../lib/security-autofix/scanner/builtin/command.adapter.ts"

test("扫描成功且报告存在才返回 EXECUTED", () => {
  assert.deepEqual(classifyScanOutcome(0, true), { status: "EXECUTED", reason: undefined })
})

test("成功退出但没有报告返回 FAIL", () => {
  assert.deepEqual(classifyScanOutcome(0, false), {
    status: "FAIL",
    reason: "扫描命令成功退出但未生成报告",
  })
})

test("扫描超时返回明确原因", () => {
  assert.deepEqual(classifyScanOutcome(143, false, true), {
    status: "FAIL",
    reason: "扫描命令执行超时",
  })
})
