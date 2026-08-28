import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { promisify } from "node:util"
import {
  acceptPatchBatch,
  beginPatchBatch,
  getPatchBatchStatus,
  listPatchBatches,
  rollbackPatchBatch,
  sealPatchBatch,
  verifyPatchBatchReceipt,
} from "../lib/security-autofix/patch/batch.ts"

const execFileAsync = promisify(execFile)

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
    const sealed = await sealPatchBatch(root, opened.batchId, ["existing.txt", "new.txt"])
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
    await sealPatchBatch(root, opened.batchId, ["file.txt"])
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
    await sealPatchBatch(root, opened.batchId, ["file.txt"])
    await writeFile(path.join(root, "file.txt"), "concurrent")
    const result = await rollbackPatchBatch(root, opened.batchId)
    assert.equal(result.status, "CONFLICT")
    assert.equal(await readFile(path.join(root, "file.txt"), "utf8"), "concurrent")
  })
})

test("OPEN 批次可在中断后发现并直接回滚", async () => {
  await project(async root => {
    await writeFile(path.join(root, "file.txt"), "before")
    const opened = await beginPatchBatch(root, ["file.txt"], "finding:recovery")
    await writeFile(path.join(root, "file.txt"), "interrupted")
    assert.equal((await getPatchBatchStatus(root, opened.batchId)).status, "OPEN")
    assert.deepEqual((await listPatchBatches(root)).map(batch => batch.batchId), [opened.batchId])
    assert.equal((await rollbackPatchBatch(root, opened.batchId)).status, "ROLLED_BACK")
    assert.equal(await readFile(path.join(root, "file.txt"), "utf8"), "before")
  })
})

test("拒绝计划外、错误声明以及零修改 Patch Batch", async () => {
  await project(async root => {
    await writeFile(path.join(root, "file.txt"), "before")
    const opened = await beginPatchBatch(root, ["file.txt"], "finding:strict")
    await assert.rejects(sealPatchBatch(root, opened.batchId, ["other.txt"]), /计划外文件/)
    await rollbackPatchBatch(root, opened.batchId)
    const corrected = await beginPatchBatch(root, ["file.txt"], "finding:strict-corrected")
    await writeFile(path.join(root, "file.txt"), "after")
    await assert.rejects(sealPatchBatch(root, corrected.batchId, []), /快照不一致/)
    await sealPatchBatch(root, corrected.batchId, ["file.txt"])
    await rollbackPatchBatch(root, corrected.batchId)

    const unchanged = await beginPatchBatch(root, ["file.txt"], "finding:zero")
    await sealPatchBatch(root, unchanged.batchId, [])
    await assert.rejects(acceptPatchBatch(root, unchanged.batchId), /没有实际修改/)
    await rollbackPatchBatch(root, unchanged.batchId)
  })
})

test("Git 工作区快照能发现未申报的计划外修改", async () => {
  await project(async root => {
    await execFileAsync("git", ["init"], { cwd: root })
    await writeFile(path.join(root, "planned.txt"), "before")
    await writeFile(path.join(root, "unplanned.txt"), "before")
    await execFileAsync("git", ["add", "."], { cwd: root })
    await execFileAsync("git", ["-c", "user.name=test", "-c", "user.email=test@example.com", "commit", "-m", "baseline"], { cwd: root })
    const opened = await beginPatchBatch(root, ["planned.txt"], "finding:workspace")
    await writeFile(path.join(root, "planned.txt"), "after")
    await writeFile(path.join(root, "unplanned.txt"), "unexpected")
    await assert.rejects(
      sealPatchBatch(root, opened.batchId, ["planned.txt"]),
      /计划外文件：unplanned\.txt/,
    )
    await rollbackPatchBatch(root, opened.batchId)
    assert.equal(await readFile(path.join(root, "unplanned.txt"), "utf8"), "before")
  })
})
