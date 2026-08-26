import { tool } from "@opencode-ai/plugin"
import { getRepairEntry, resolveRepairEntryById } from "../repair/catalog"

export const autofixRepairTool = tool({
  description:
    "根据 Classification 已选定的 repair_entry_id、语言和框架，验证 Repair Entry 适用性并返回领域 Repair Skill、strategy 和验证要求。",
  args: {
    repair_entry_id: tool.schema.string().describe("autofix_classify 选定的 Repair Entry ID"),
    language: tool.schema.string().optional().describe("已确认的语言；未知时不要猜测"),
    framework: tool.schema.string().optional().describe("已确认的框架/组件；未知时不要猜测"),
  },
  async execute(args) {
    const registered = getRepairEntry(args.repair_entry_id)
    if (!registered) {
      return JSON.stringify({
        status: "NOT_SUPPORTED",
        repair_entry_id: args.repair_entry_id,
        reason: "Repair Catalog 中不存在该 repair_entry_id",
      })
    }

    const entry = resolveRepairEntryById(args.repair_entry_id, args.language, args.framework)
    if (!entry) {
      return JSON.stringify({
        status: "NOT_SUPPORTED",
        repair_entry_id: registered.id,
        display_type: registered.display_type,
        language: args.language,
        framework: args.framework,
        reason: "Repair Entry 不支持已确认的语言或框架",
      })
    }

    return JSON.stringify({
      status: "MATCHED",
      repair_entry_id: entry.id,
      display_type: entry.display_type,
      name_zh: entry.name_zh,
      repair_provider: entry.provider,
      strategy: entry.strategy,
      default_fixability: entry.default_fixability,
      validators: entry.validators,
      priority: entry.priority,
      supported_languages: entry.supported_languages,
      supported_frameworks: entry.supported_frameworks,
    })
  },
})
