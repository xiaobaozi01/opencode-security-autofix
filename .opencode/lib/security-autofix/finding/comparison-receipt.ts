import { createHash, randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type { FindingComparisonStatus } from "./compare.ts"

interface ComparisonReceipt {
  version: 1
  comparisonId: string
  status: FindingComparisonStatus
  findingKey?: string
  baselineFile: string
  baselineHash: string
  rescanFile: string
  rescanHash: string
  completedAt: string
}

const COMPARISON_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function receiptRoot(worktreeRoot: string) {
  return path.join(path.resolve(worktreeRoot), ".opencode", ".cache", "security-autofix", "comparison-receipts")
}

function receiptPath(worktreeRoot: string, comparisonId: string) {
  if (!COMPARISON_ID.test(comparisonId)) throw new Error("非法 Comparison Receipt ID")
  return path.join(receiptRoot(worktreeRoot), `${comparisonId}.json`)
}

function resolveReport(worktreeRoot: string, file: string) {
  const root = path.resolve(worktreeRoot)
  if (!file.trim() || path.isAbsolute(file)) throw new Error(`报告必须是项目内相对路径：${file}`)
  const absolutePath = path.resolve(root, file)
  const relativePath = path.relative(root, absolutePath)
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`报告路径越出工作区：${file}`)
  }
  return { absolutePath, relativePath: relativePath.replace(/\\/g, "/") }
}

async function reportHash(absolutePath: string) {
  return createHash("sha256").update(await readFile(absolutePath)).digest("hex")
}

export async function writeComparisonReceipt(
  worktreeRoot: string,
  input: {
    status: FindingComparisonStatus
    findingKey?: string
    baselineFile: string
    rescanFile: string
  },
) {
  const baseline = resolveReport(worktreeRoot, input.baselineFile)
  const rescan = resolveReport(worktreeRoot, input.rescanFile)
  if (baseline.absolutePath === rescan.absolutePath) {
    throw new Error("baseline 和 rescan 必须是两份不同的报告文件")
  }
  const comparisonId = randomUUID()
  const receipt: ComparisonReceipt = {
    version: 1,
    comparisonId,
    status: input.status,
    findingKey: input.findingKey,
    baselineFile: baseline.relativePath,
    baselineHash: await reportHash(baseline.absolutePath),
    rescanFile: rescan.relativePath,
    rescanHash: await reportHash(rescan.absolutePath),
    completedAt: new Date().toISOString(),
  }
  await mkdir(receiptRoot(worktreeRoot), { recursive: true })
  await writeFile(receiptPath(worktreeRoot, comparisonId), JSON.stringify(receipt, null, 2), {
    encoding: "utf8",
    flag: "wx",
  })
  return receipt
}

export async function verifyComparisonReceipt(
  worktreeRoot: string,
  comparisonId: string,
  findingKey?: string,
  baselineReference?: string,
) {
  try {
    const receipt = JSON.parse(
      await readFile(receiptPath(worktreeRoot, comparisonId), "utf8"),
    ) as ComparisonReceipt
    if (receipt.comparisonId !== comparisonId || receipt.status !== "ABSENT") {
      return { valid: false, reason: "Comparison Receipt 的 ID 或状态不匹配" }
    }
    if (!findingKey || receipt.findingKey !== findingKey) {
      return { valid: false, reason: "Comparison Receipt 不属于当前 Finding" }
    }
    if (baselineReference) {
      const expected = resolveReport(worktreeRoot, baselineReference).relativePath
      if (receipt.baselineFile !== expected) {
        return { valid: false, reason: "Comparison Receipt 的 baseline 与最终结果不一致" }
      }
    }
    const baseline = resolveReport(worktreeRoot, receipt.baselineFile)
    const rescan = resolveReport(worktreeRoot, receipt.rescanFile)
    if (baseline.absolutePath === rescan.absolutePath) {
      return { valid: false, reason: "Comparison Receipt 的 baseline 和 rescan 不是独立文件" }
    }
    if (await reportHash(baseline.absolutePath) !== receipt.baselineHash ||
        await reportHash(rescan.absolutePath) !== receipt.rescanHash) {
      return { valid: false, reason: "Comparison Receipt 引用的报告内容已经变化" }
    }
    return { valid: true, receipt }
  } catch (error) {
    return {
      valid: false,
      reason: `未找到有效 Comparison Receipt：${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
