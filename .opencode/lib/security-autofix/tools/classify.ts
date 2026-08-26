import { tool } from "@opencode-ai/plugin"
import { classifyFinding, listSupportedDisplayTypes } from "../classification/registry"

const ruleSchema = tool.schema.object({
  scanner: tool.schema.string().optional(),
  rule_id: tool.schema.string().optional(),
  rule_version: tool.schema.string().optional(),
  fingerprint: tool.schema.string().optional(),
})

const taxonomySchema = tool.schema.object({
  name: tool.schema.string(),
  id: tool.schema.string(),
  relationship: tool.schema.enum(["equal", "subset", "superset", "relevant"]).optional(),
  source: tool.schema.enum(["scanner", "adapter", "classifier"]),
})

const semanticCandidateSchema = tool.schema.object({
  display_type: tool.schema.string(),
  confidence: tool.schema.enum(["HIGH", "MEDIUM", "LOW"]),
  evidence: tool.schema.array(tool.schema.string()).optional(),
})

export const autofixClassifyTool = tool({
  description:
    "根据 Scanner Rule、Taxonomy、原始类型和 Agent 语义候选生成可审计的 Repair 分类。语义候选不能直接触发自动修复。",
  args: {
    rule: ruleSchema.optional(),
    taxonomies: tool.schema.array(taxonomySchema).optional(),
    raw_type: tool.schema.string().optional(),
    semantic_candidates: tool.schema.array(semanticCandidateSchema).optional(),
  },
  async execute(args) {
    const classification = classifyFinding(args)
    return JSON.stringify({
      ...classification,
      supported_display_types:
        classification.status === "MATCHED" ? undefined : listSupportedDisplayTypes(),
    })
  },
})
