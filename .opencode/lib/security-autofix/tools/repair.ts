import { tool } from "@opencode-ai/plugin"
import { resolveRepairEntry } from "../repair/catalog"

export const autofixRepairTool = tool({
  description:
    "根据标准漏洞类型、语言和框架，从内置 Repair Catalog 确定领域 Repair Skill、strategy、默认可修复等级和验证要求。",
  args: {
    type: tool.schema.string().describe("标准漏洞类型，例如 SQL_INJECTION"),
    language: tool.schema.string().optional().describe("已确认的语言；未知时不要猜测"),
    framework: tool.schema.string().optional().describe("已确认的框架/组件；未知时不要猜测"),
  },
  async execute(args) {
    const entry = resolveRepairEntry(args.type, args.language, args.framework)
    if (!entry) {
      return JSON.stringify({
        status: "NOT_SUPPORTED",
        type: args.type.trim().toUpperCase(),
        language: args.language,
        framework: args.framework,
        reason: "Repair Catalog 中没有匹配项，禁止猜测 Repair Skill 或 strategy",
      })
    }

    return JSON.stringify({
      status: "MATCHED",
      catalog_entry_id: entry.id,
      type: entry.type,
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
