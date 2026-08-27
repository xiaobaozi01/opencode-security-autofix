import { createHash, randomUUID } from "node:crypto"
import { chmod, lstat, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

interface FileState {
  exists: boolean
  hash?: string
  mode?: number
  content?: string
}

interface PatchBatchFile {
  path: string
  baseline: FileState
  sealed?: Omit<FileState, "content">
}

interface PatchBatchManifest {
  version: 1
  batchId: string
  state: "OPEN" | "SEALED"
  createdAt: string
  findingKey?: string
  files: PatchBatchFile[]
}

interface PatchBatchReceipt {
  version: 1
  batchId: string
  status: "ACCEPTED" | "ROLLED_BACK"
  findingKey?: string
  completedAt: string
  files: string[]
}

const BATCH_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function digest(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex")
}

function patchRoot(worktreeRoot: string) {
  return path.join(path.resolve(worktreeRoot), ".opencode", ".cache", "security-autofix", "patches")
}

function receiptRoot(worktreeRoot: string) {
  return path.join(path.resolve(worktreeRoot), ".opencode", ".cache", "security-autofix", "patch-receipts")
}

function batchDirectory(worktreeRoot: string, batchId: string) {
  if (!BATCH_ID.test(batchId)) throw new Error("非法 Patch Batch ID")
  return path.join(patchRoot(worktreeRoot), batchId)
}

function manifestPath(worktreeRoot: string, batchId: string) {
  return path.join(batchDirectory(worktreeRoot, batchId), "manifest.json")
}

function receiptPath(worktreeRoot: string, batchId: string) {
  if (!BATCH_ID.test(batchId)) throw new Error("非法 Patch Batch ID")
  return path.join(receiptRoot(worktreeRoot), `${batchId}.json`)
}

function resolveProjectFile(worktreeRoot: string, configuredPath: string) {
  const root = path.resolve(worktreeRoot)
  if (!configuredPath.trim() || path.isAbsolute(configuredPath)) {
    throw new Error(`Patch 文件必须是项目内相对路径：${configuredPath}`)
  }
  const absolutePath = path.resolve(root, configuredPath)
  const relativePath = path.relative(root, absolutePath)
  if (
    !relativePath ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath) ||
    relativePath.split(path.sep).includes(".git") ||
    relativePath.replace(/\\/g, "/").startsWith(".opencode/.cache/security-autofix/")
  ) {
    throw new Error(`非法 Patch 文件路径：${configuredPath}`)
  }
  return {
    absolutePath,
    relativePath: relativePath.replace(/\\/g, "/"),
  }
}

async function fileState(absolutePath: string, includeContent: boolean): Promise<FileState> {
  try {
    const info = await lstat(absolutePath)
    if (info.isSymbolicLink()) throw new Error(`Patch Batch 不支持符号链接：${absolutePath}`)
    if (!info.isFile()) throw new Error(`Patch Batch 只支持普通文件：${absolutePath}`)
    const bytes = await readFile(absolutePath)
    return {
      exists: true,
      hash: digest(bytes),
      mode: info.mode & 0o777,
      content: includeContent ? bytes.toString("base64") : undefined,
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return { exists: false }
    }
    throw error
  }
}

async function readManifest(worktreeRoot: string, batchId: string) {
  const raw = await readFile(manifestPath(worktreeRoot, batchId), "utf8")
  return JSON.parse(raw) as PatchBatchManifest
}

async function writeManifest(worktreeRoot: string, manifest: PatchBatchManifest) {
  await writeFile(
    manifestPath(worktreeRoot, manifest.batchId),
    JSON.stringify(manifest, null, 2),
    "utf8",
  )
}

function sameState(left: FileState, right: FileState | undefined) {
  return Boolean(right) && left.exists === right?.exists && left.hash === right?.hash
}

export async function beginPatchBatch(worktreeRoot: string, files: string[], findingKey?: string) {
  if (!Array.isArray(files) || !files.length) throw new Error("Patch Batch 至少需要一个计划文件")
  if (!findingKey?.trim()) throw new Error("Patch Batch 必须绑定确定性的 finding_key")
  const resolved = files.map(file => resolveProjectFile(worktreeRoot, file))
  const unique = [...new Map(resolved.map(file => [file.relativePath, file])).values()]
  const batchId = randomUUID()
  const directory = batchDirectory(worktreeRoot, batchId)
  await mkdir(patchRoot(worktreeRoot), { recursive: true })
  await mkdir(directory, { recursive: false })
  try {
    const manifest: PatchBatchManifest = {
      version: 1,
      batchId,
      state: "OPEN",
      createdAt: new Date().toISOString(),
      findingKey: findingKey.trim(),
      files: await Promise.all(unique.map(async file => ({
        path: file.relativePath,
        baseline: await fileState(file.absolutePath, true),
      }))),
    }
    await writeFile(manifestPath(worktreeRoot, batchId), JSON.stringify(manifest, null, 2), {
      encoding: "utf8",
      flag: "wx",
    })
    return {
      status: "OPEN" as const,
      batchId,
      findingKey: manifest.findingKey,
      files: manifest.files.map(file => file.path),
    }
  } catch (error) {
    await rm(directory, { recursive: true, force: true })
    throw error
  }
}

async function writeReceipt(
  worktreeRoot: string,
  manifest: PatchBatchManifest,
  status: PatchBatchReceipt["status"],
) {
  const receipt: PatchBatchReceipt = {
    version: 1,
    batchId: manifest.batchId,
    status,
    findingKey: manifest.findingKey,
    completedAt: new Date().toISOString(),
    files: manifest.files.map(file => file.path),
  }
  await mkdir(receiptRoot(worktreeRoot), { recursive: true })
  await writeFile(receiptPath(worktreeRoot, manifest.batchId), JSON.stringify(receipt, null, 2), {
    encoding: "utf8",
    flag: "wx",
  })
}

export async function sealPatchBatch(worktreeRoot: string, batchId: string) {
  const manifest = await readManifest(worktreeRoot, batchId)
  if (manifest.state !== "OPEN") throw new Error(`Patch Batch ${batchId} 已经封存`)
  const changedFiles: string[] = []
  for (const file of manifest.files) {
    const resolved = resolveProjectFile(worktreeRoot, file.path)
    file.sealed = await fileState(resolved.absolutePath, false)
    if (!sameState(file.baseline, file.sealed)) changedFiles.push(file.path)
  }
  manifest.state = "SEALED"
  await writeManifest(worktreeRoot, manifest)
  return {
    status: "SEALED" as const,
    batchId,
    changedFiles,
    unchangedFiles: manifest.files.map(file => file.path).filter(file => !changedFiles.includes(file)),
  }
}

async function ensureSealedStateUnchanged(worktreeRoot: string, manifest: PatchBatchManifest) {
  const conflicts: string[] = []
  for (const file of manifest.files) {
    const resolved = resolveProjectFile(worktreeRoot, file.path)
    const current = await fileState(resolved.absolutePath, false)
    if (!sameState(current, file.sealed)) conflicts.push(file.path)
  }
  return conflicts
}

export async function rollbackPatchBatch(worktreeRoot: string, batchId: string) {
  const manifest = await readManifest(worktreeRoot, batchId)
  if (manifest.state !== "SEALED") throw new Error(`Patch Batch ${batchId} 尚未封存，禁止回滚`)
  const conflicts = await ensureSealedStateUnchanged(worktreeRoot, manifest)
  if (conflicts.length) {
    return {
      status: "CONFLICT" as const,
      batchId,
      conflicts,
      reason: "封存后文件再次变化，为避免覆盖并发修改，未执行回滚",
    }
  }

  for (const file of manifest.files) {
    const resolved = resolveProjectFile(worktreeRoot, file.path)
    if (!file.baseline.exists) {
      try {
        await unlink(resolved.absolutePath)
      } catch (error) {
        if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error
      }
      continue
    }
    await mkdir(path.dirname(resolved.absolutePath), { recursive: true })
    await writeFile(resolved.absolutePath, Buffer.from(file.baseline.content ?? "", "base64"))
    if (file.baseline.mode !== undefined) await chmod(resolved.absolutePath, file.baseline.mode)
  }
  await writeReceipt(worktreeRoot, manifest, "ROLLED_BACK")
  await rm(batchDirectory(worktreeRoot, batchId), { recursive: true, force: true })
  return { status: "ROLLED_BACK" as const, batchId, files: manifest.files.map(file => file.path) }
}

export async function acceptPatchBatch(worktreeRoot: string, batchId: string) {
  const manifest = await readManifest(worktreeRoot, batchId)
  if (manifest.state !== "SEALED") throw new Error(`Patch Batch ${batchId} 尚未封存，禁止接受`)
  const conflicts = await ensureSealedStateUnchanged(worktreeRoot, manifest)
  if (conflicts.length) {
    return {
      status: "CONFLICT" as const,
      batchId,
      conflicts,
      reason: "封存后文件再次变化，Patch Batch 不能被确定性接受",
    }
  }
  await writeReceipt(worktreeRoot, manifest, "ACCEPTED")
  await rm(batchDirectory(worktreeRoot, batchId), { recursive: true, force: true })
  return { status: "ACCEPTED" as const, batchId, files: manifest.files.map(file => file.path) }
}

export async function verifyPatchBatchReceipt(
  worktreeRoot: string,
  batchId: string,
  expectedStatus: PatchBatchReceipt["status"],
  findingKey?: string,
) {
  try {
    const receipt = JSON.parse(await readFile(receiptPath(worktreeRoot, batchId), "utf8")) as PatchBatchReceipt
    if (receipt.batchId !== batchId || receipt.status !== expectedStatus) {
      return { valid: false, reason: "Patch Batch Receipt 的 ID 或状态不匹配" }
    }
    if (findingKey && receipt.findingKey !== findingKey) {
      return { valid: false, reason: "Patch Batch Receipt 不属于当前 Finding" }
    }
    return { valid: true, receipt }
  } catch (error) {
    return {
      valid: false,
      reason: `未找到有效 Patch Batch Receipt：${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
