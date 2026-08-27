import { tool } from "@opencode-ai/plugin"
import path from "node:path"
import {
  acceptPatchBatch,
  beginPatchBatch,
  rollbackPatchBatch,
  sealPatchBatch,
} from "../patch/batch"

export const autofixPatchTool = tool({
  description:
    "管理隔离 Patch Batch：修改前 begin 快照计划文件，修改后 seal，只有 FIX_ACCEPTED 才 accept，其余结论 rollback。",
  args: {
    action: tool.schema.enum(["begin", "seal", "accept", "rollback"]),
    batch_id: tool.schema.string().optional(),
    finding_key: tool.schema.string().optional(),
    files: tool.schema.array(tool.schema.string()).optional(),
  },
  async execute(args, context) {
    const root = path.resolve(context.worktree)
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
    if (args.action === "seal") {
      const result = await sealPatchBatch(root, args.batch_id)
      return JSON.stringify({
        status: result.status,
        batch_id: result.batchId,
        changed_files: result.changedFiles,
        unchanged_files: result.unchangedFiles,
      })
    }
    if (args.action === "accept") {
      const result = await acceptPatchBatch(root, args.batch_id)
      return JSON.stringify({
        ...result,
        batch_id: result.batchId,
        batchId: undefined,
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
