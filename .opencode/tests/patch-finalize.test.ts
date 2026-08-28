import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { writeComparisonReceipt } from "../lib/security-autofix/finding/comparison-receipt.ts"
import {
  beginPatchBatch,
  sealPatchBatch,
  verifyPatchBatchReceipt,
} from "../lib/security-autofix/patch/batch.ts"
import {
  finalizePatchBatch,
  type PatchBatchFinalizationInput,
} from "../lib/security-autofix/patch/finalize.ts"

async function project(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "autofix-patch-finalize-test-"))
  try {
    await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

function acceptedInput(
  batchId: string,
  findingKey: string,
  comparisonId: string,
): PatchBatchFinalizationInput {
  return {
    batchId,
    findingKey,
    verdict: "FIX_ACCEPTED",
    analysisVerdict: "VULNERABLE",
    analysisConfidence: "HIGH",
    routeStatus: "MATCHED",
    comparisonId,
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

async function sealedPatch(root: string, findingKey: string) {
  await writeFile(path.join(root, "file.txt"), "before")
  const opened = await beginPatchBatch(root, ["file.txt"], findingKey)
  await writeFile(path.join(root, "file.txt"), "after")
  await sealPatchBatch(root, opened.batchId, ["file.txt"])
  return opened
}

async function comparison(root: string, findingKey: string) {
  await writeFile(path.join(root, "baseline.sarif"), "baseline")
  await writeFile(path.join(root, "rescan.sarif"), "rescan")
  return writeComparisonReceipt(root, {
    status: "ABSENT",
    findingKey,
    baselineFile: "baseline.sarif",
    rescanFile: "rescan.sarif",
  })
}

test("全部 Gate 和 Comparison Receipt 有效后才接受 Patch Batch", async () => {
  await project(async root => {
    const findingKey = "finding:accepted"
    const opened = await sealedPatch(root, findingKey)
    const receipt = await comparison(root, findingKey)

    const result = await finalizePatchBatch(
      root,
      acceptedInput(opened.batchId, findingKey, receipt.comparisonId),
    )

    assert.equal(result.status, "ACCEPTED")
    assert.equal(result.acceptanceStatus, "ACCEPTED")
    assert.equal(result.finalVerdict, "FIX_ACCEPTED")
    assert.equal(await readFile(path.join(root, "file.txt"), "utf8"), "after")
    assert.equal((await verifyPatchBatchReceipt(
      root,
      opened.batchId,
      "ACCEPTED",
      findingKey,
    )).valid, true)
  })
})

test("Comparison Receipt 在接受前失效时回滚补丁", async () => {
  await project(async root => {
    const findingKey = "finding:stale-comparison"
    const opened = await sealedPatch(root, findingKey)
    const receipt = await comparison(root, findingKey)
    await writeFile(path.join(root, "rescan.sarif"), "replaced-after-comparison")

    const result = await finalizePatchBatch(
      root,
      acceptedInput(opened.batchId, findingKey, receipt.comparisonId),
    )

    assert.equal(result.status, "ROLLED_BACK")
    assert.equal(result.acceptanceStatus, "REJECTED")
    assert.equal(result.finalVerdict, "HUMAN_REVIEW")
    assert.ok(result.errors.some(error => error.includes("内容已经变化")))
    assert.equal(await readFile(path.join(root, "file.txt"), "utf8"), "before")
    assert.equal((await verifyPatchBatchReceipt(
      root,
      opened.batchId,
      "ROLLED_BACK",
      findingKey,
    )).valid, true)
  })
})

test("必要 Gate 未通过时不会接受并自动回滚", async () => {
  await project(async root => {
    const findingKey = "finding:not-run"
    const opened = await sealedPatch(root, findingKey)
    const receipt = await comparison(root, findingKey)
    const input = acceptedInput(opened.batchId, findingKey, receipt.comparisonId)
    input.gates = { ...input.gates, tests: "NOT_RUN" }

    const result = await finalizePatchBatch(root, input)

    assert.equal(result.status, "ROLLED_BACK")
    assert.equal(result.acceptanceStatus, "REJECTED")
    assert.equal(result.finalVerdict, "HUMAN_REVIEW")
    assert.ok(result.errors.some(error => error.includes("所有必要 Gate")))
    assert.equal(await readFile(path.join(root, "file.txt"), "utf8"), "before")
  })
})

test("拒绝或人工审核裁决统一通过 finalize 回滚", async () => {
  await project(async root => {
    for (const verdict of ["FIX_REJECTED", "HUMAN_REVIEW"] as const) {
      const findingKey = `finding:${verdict.toLowerCase()}`
      const opened = await sealedPatch(root, findingKey)
      const result = await finalizePatchBatch(root, {
        batchId: opened.batchId,
        findingKey,
        verdict,
      })
      assert.equal(result.status, "ROLLED_BACK")
      assert.equal(await readFile(path.join(root, "file.txt"), "utf8"), "before")
    }
  })
})
