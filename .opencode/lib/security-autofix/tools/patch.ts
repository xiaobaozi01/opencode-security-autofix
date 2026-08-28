import { tool } from "@opencode-ai/plugin"
import path from "node:path"
import {
  beginPatchBatch,
  getPatchBatchStatus,
  listPatchBatches,
  rollbackPatchBatch,
  sealPatchBatch,
} from "../patch/batch"
import { finalizePatchBatch } from "../patch/finalize"

const gateStatusSchema = tool.schema.enum([
  "PASS",
  "FAIL",
  "PRESENT",
  "ABSENT",
  "NOT_RUN",
  "INDETERMINATE",
  "WARN",
  "UNKNOWN",
])

export const autofixPatchTool = tool({
  description:
    "管理隔离 Patch Batch：修改前 begin 快照，修改后 seal，最终统一通过 finalize 校验证据并接受或回滚。",
  args: {
    action: tool.schema.enum(["begin", "seal", "finalize", "rollback", "status", "list"]),
    batch_id: tool.schema.string().optional(),
    finding_key: tool.schema.string().optional(),
    files: tool.schema.array(tool.schema.string()).optional(),
    verdict: tool.schema.enum(["FIX_ACCEPTED", "FIX_REJECTED", "HUMAN_REVIEW"]).optional(),
    analysis_verdict: tool.schema
      .enum(["VULNERABLE", "NOT_VULNERABLE", "PARTIAL", "NEED_CONTEXT"])
      .optional(),
    analysis_confidence: tool.schema.enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]).optional(),
    route_status: tool.schema
      .enum(["MATCHED", "AMBIGUOUS", "UNCLASSIFIED", "NOT_SUPPORTED", "HUMAN_REVIEW", "FALSE_POSITIVE"])
      .optional(),
    gates: tool.schema.object({
      analysis: gateStatusSchema,
      patch: gateStatusSchema,
      security_review: gateStatusSchema,
      build: gateStatusSchema,
      tests: gateStatusSchema,
      rescan: gateStatusSchema,
      regression_review: gateStatusSchema,
    }).optional(),
    comparison_id: tool.schema.string().optional(),
  },
  async execute(args, context) {
    const root = path.resolve(context.worktree)
    if (args.action === "list") {
      return JSON.stringify({ status: "OK", batches: await listPatchBatches(root) })
    }
    if (args.action === "begin") {
      const result = await beginPatchBatch(root, args.files ?? [], args.finding_key)
      return JSON.stringify({
        status: result.status,
        batch_id: result.batchId,
        finding_key: result.findingKey,
        files: result.files,
      })
    }
    if (!args.batch_id) {
      return JSON.stringify({ status: "FAILED", reason: `${args.action} 必须传入 batch_id` })
    }
    if (args.action === "status") {
      return JSON.stringify(await getPatchBatchStatus(root, args.batch_id))
    }
    if (args.action === "seal") {
      const result = await sealPatchBatch(root, args.batch_id, args.files ?? [])
      return JSON.stringify({
        status: result.status,
        batch_id: result.batchId,
        changed_files: result.changedFiles,
        unchanged_files: result.unchangedFiles,
      })
    }
    if (args.action === "finalize") {
      if (!args.finding_key || !args.verdict) {
        return JSON.stringify({
          status: "FAILED",
          reason: "finalize 必须传入 finding_key 和 verdict",
        })
      }
      const result = await finalizePatchBatch(root, {
        batchId: args.batch_id,
        findingKey: args.finding_key,
        verdict: args.verdict,
        analysisVerdict: args.analysis_verdict,
        analysisConfidence: args.analysis_confidence,
        routeStatus: args.route_status,
        gates: args.gates,
        comparisonId: args.comparison_id,
      })
      return JSON.stringify({
        ...result,
        batch_id: result.batchId,
        batchId: undefined,
        acceptance_status: result.acceptanceStatus,
        acceptanceStatus: undefined,
        requested_verdict: result.requestedVerdict,
        requestedVerdict: undefined,
        final_verdict: result.finalVerdict,
        finalVerdict: undefined,
        comparison_id: "comparisonId" in result ? result.comparisonId : undefined,
        comparisonId: undefined,
      })
    }
    const result = await rollbackPatchBatch(root, args.batch_id)
    return JSON.stringify({
      ...result,
      batch_id: result.batchId,
      batchId: undefined,
    })
  },
})
