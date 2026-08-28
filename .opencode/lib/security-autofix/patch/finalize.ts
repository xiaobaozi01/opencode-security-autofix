import { verifyComparisonReceipt } from "../finding/comparison-receipt.ts"
import { validateFinalFinding } from "../workflow/verdict.ts"
import {
  acceptPatchBatch,
  getPatchBatchStatus,
  rollbackPatchBatch,
} from "./batch.ts"

export type PatchFinalVerdict = "FIX_ACCEPTED" | "FIX_REJECTED" | "HUMAN_REVIEW"

export interface PatchBatchFinalizationInput {
  batchId: string
  findingKey: string
  verdict: PatchFinalVerdict
  analysisVerdict?: string
  analysisConfidence?: string
  routeStatus?: string
  gates?: Record<string, string>
  comparisonId?: string
}

const FAILED_GATE_STATUSES = new Set(["FAIL", "FAILED", "PRESENT", "REJECTED"])

function rejectedFinalVerdict(input: PatchBatchFinalizationInput): PatchFinalVerdict {
  return Object.values(input.gates ?? {}).some(status => FAILED_GATE_STATUSES.has(status))
    ? "FIX_REJECTED"
    : "HUMAN_REVIEW"
}

function acceptanceCandidate(input: PatchBatchFinalizationInput) {
  return {
    id: input.findingKey,
    finding_key: input.findingKey,
    verdict: input.verdict,
    analysis_verdict: input.analysisVerdict,
    analysis_confidence: input.analysisConfidence,
    route: { status: input.routeStatus },
    gates: input.gates ?? {},
    patch_batch: {
      batch_id: input.batchId,
      // 这里校验的是“如果接受后”的最终状态；实际 Batch 此时仍必须是 SEALED。
      status: "ACCEPTED",
    },
    rescan_comparison_id: input.comparisonId,
  }
}

async function rejectAcceptance(
  worktreeRoot: string,
  input: PatchBatchFinalizationInput,
  errors: string[],
) {
  const rollback = await rollbackPatchBatch(worktreeRoot, input.batchId)
  return {
    ...rollback,
    acceptanceStatus: "REJECTED" as const,
    requestedVerdict: input.verdict,
    finalVerdict: input.verdict === "FIX_ACCEPTED" ? rejectedFinalVerdict(input) : input.verdict,
    errors: [...new Set(errors)],
  }
}

/**
 * Patch Batch 的唯一正常结束入口。
 *
 * FIX_ACCEPTED 必须先通过最终 Gate 校验和 Comparison Receipt 校验，之后才会
 * 删除回滚快照。其他裁决以及证据校验失败都会立即回滚。
 */
export async function finalizePatchBatch(
  worktreeRoot: string,
  input: PatchBatchFinalizationInput,
) {
  const batch = await getPatchBatchStatus(worktreeRoot, input.batchId)
  if (batch.status !== "SEALED") {
    return {
      status: "CONFLICT" as const,
      acceptanceStatus: "REJECTED" as const,
      batchId: input.batchId,
      requestedVerdict: input.verdict,
      finalVerdict: "HUMAN_REVIEW" as const,
      errors: [`Patch Batch ${input.batchId} 必须处于 SEALED 状态才能最终裁决`],
    }
  }
  if (batch.findingKey !== input.findingKey) {
    return {
      status: "CONFLICT" as const,
      acceptanceStatus: "REJECTED" as const,
      batchId: input.batchId,
      requestedVerdict: input.verdict,
      finalVerdict: "HUMAN_REVIEW" as const,
      errors: ["Patch Batch 不属于当前 Finding；为避免回滚错误批次，未修改工作区"],
    }
  }

  if (input.verdict !== "FIX_ACCEPTED") {
    return rejectAcceptance(worktreeRoot, input, [
      `最终裁决为 ${input.verdict}，Patch Batch 不得保留`,
    ])
  }

  const errors = validateFinalFinding(acceptanceCandidate(input), 0, "AUTOFIX")
  if (input.comparisonId) {
    const comparison = await verifyComparisonReceipt(
      worktreeRoot,
      input.comparisonId,
      input.findingKey,
    )
    if (!comparison.valid) errors.push(comparison.reason)
  }

  if (errors.length) return rejectAcceptance(worktreeRoot, input, errors)

  const accepted = await acceptPatchBatch(worktreeRoot, input.batchId)
  return {
    ...accepted,
    acceptanceStatus: accepted.status === "ACCEPTED" ? "ACCEPTED" as const : "REJECTED" as const,
    requestedVerdict: input.verdict,
    finalVerdict: accepted.status === "ACCEPTED" ? "FIX_ACCEPTED" as const : "HUMAN_REVIEW" as const,
    comparisonId: input.comparisonId,
  }
}
