import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { writeUniqueTextFile } from "../lib/security-autofix/tools/result-file.ts"

test("同名报告不会覆盖，冲突时追加序号", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "autofix-result-test-"))
  try {
    const first = await writeUniqueTextFile(directory, "security-autofix-result-2026-08-25.md", "first")
    const second = await writeUniqueTextFile(directory, "security-autofix-result-2026-08-25.md", "second")

    assert.equal(path.basename(first), "security-autofix-result-2026-08-25.md")
    assert.equal(path.basename(second), "security-autofix-result-2026-08-25-01.md")
    assert.equal(await readFile(first, "utf8"), "first")
    assert.equal(await readFile(second, "utf8"), "second")
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
