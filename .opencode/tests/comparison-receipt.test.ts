import assert from "node:assert/strict"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import {
  verifyComparisonReceipt,
  writeComparisonReceipt,
} from "../lib/security-autofix/finding/comparison-receipt.ts"

async function project(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "autofix-comparison-receipt-test-"))
  try {
    await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test("Comparison Receipt 绑定 Finding、两份报告和内容哈希", async () => {
  await project(async root => {
    await writeFile(path.join(root, "baseline.sarif"), "baseline")
    await writeFile(path.join(root, "rescan.sarif"), "rescan")
    const receipt = await writeComparisonReceipt(root, {
      status: "ABSENT",
      findingKey: "finding:test",
      baselineFile: "baseline.sarif",
      rescanFile: "rescan.sarif",
    })
    assert.equal((await verifyComparisonReceipt(
      root,
      receipt.comparisonId,
      "finding:test",
      "baseline.sarif",
    )).valid, true)
    assert.equal((await verifyComparisonReceipt(
      root,
      receipt.comparisonId,
      "finding:other",
      "baseline.sarif",
    )).valid, false)
    await writeFile(path.join(root, "rescan.sarif"), "replaced")
    assert.equal((await verifyComparisonReceipt(
      root,
      receipt.comparisonId,
      "finding:test",
      "baseline.sarif",
    )).valid, false)
  })
})

test("Comparison Receipt 拒绝同一文件同时作为 baseline 和 rescan", async () => {
  await project(async root => {
    await writeFile(path.join(root, "report.sarif"), "same")
    await assert.rejects(writeComparisonReceipt(root, {
      status: "ABSENT",
      findingKey: "finding:test",
      baselineFile: "report.sarif",
      rescanFile: "report.sarif",
    }), /两份不同/)
  })
})
