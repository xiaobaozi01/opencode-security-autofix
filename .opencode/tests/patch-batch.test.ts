import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import {
  acceptPatchBatch,
  beginPatchBatch,
  rollbackPatchBatch,
  sealPatchBatch,
  verifyPatchBatchReceipt,
} from "../lib/security-autofix/patch/batch.ts"

async function project(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "autofix-patch-batch-test-"))
  try {
    await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test("拒绝 Patch Batch 时恢复既有文件并删除批次新增文件", async () => {
  await project(async root => {
    await writeFile(path.join(root, "existing.txt"), "before")
    await assert.rejects(
      beginPatchBatch(root, ["existing.txt"]),
      /finding_key/,
    )
    await assert.rejects(
      beginPatchBatch(
        root,
        [".opencode/.cache/security-autofix/patch-receipts/fake.json"],
        "finding:test",
      ),
      /非法 Patch 文件路径/,
    )
    const opened = await beginPatchBatch(root, ["existing.txt", "new.txt"], "finding:test")
    await writeFile(path.join(root, "existing.txt"), "after")
    await writeFile(path.join(root, "new.txt"), "created")
    const sealed = await sealPatchBatch(root, opened.batchId)
    assert.deepEqual(new Set(sealed.changedFiles), new Set(["existing.txt", "new.txt"]))

    const rolledBack = await rollbackPatchBatch(root, opened.batchId)
    assert.equal(rolledBack.status, "ROLLED_BACK")
    assert.equal((await verifyPatchBatchReceipt(
      root,
      opened.batchId,
      "ROLLED_BACK",
      "finding:test",
    )).valid, true)
    assert.equal((await verifyPatchBatchReceipt(
      root,
      opened.batchId,
      "ROLLED_BACK",
      "finding:other",
    )).valid, false)
    assert.equal(await readFile(path.join(root, "existing.txt"), "utf8"), "before")
    await assert.rejects(readFile(path.join(root, "new.txt")), /ENOENT/)
  })
})

test("接受 Patch Batch 时保留封存后的修改", async () => {
  await project(async root => {
    await writeFile(path.join(root, "file.txt"), "before")
    const opened = await beginPatchBatch(root, ["file.txt"], "finding:test")
    await writeFile(path.join(root, "file.txt"), "after")
    await sealPatchBatch(root, opened.batchId)
    const accepted = await acceptPatchBatch(root, opened.batchId)
    assert.equal(accepted.status, "ACCEPTED")
    assert.equal((await verifyPatchBatchReceipt(
      root,
      opened.batchId,
      "ACCEPTED",
      "finding:test",
    )).valid, true)
    assert.equal(await readFile(path.join(root, "file.txt"), "utf8"), "after")
  })
})

test("封存后文件再次变化时拒绝覆盖并发修改", async () => {
  await project(async root => {
    await writeFile(path.join(root, "file.txt"), "before")
    const opened = await beginPatchBatch(root, ["file.txt"], "finding:test")
    await writeFile(path.join(root, "file.txt"), "patched")
    await sealPatchBatch(root, opened.batchId)
    await writeFile(path.join(root, "file.txt"), "concurrent")
    const result = await rollbackPatchBatch(root, opened.batchId)
    assert.equal(result.status, "CONFLICT")
    assert.equal(await readFile(path.join(root, "file.txt"), "utf8"), "concurrent")
  })
})
