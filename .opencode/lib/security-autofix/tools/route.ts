import { tool } from "@opencode-ai/plugin"
import { routeFinding } from "../repair/router"

const ruleSchema = tool.schema.object({
  scanner: tool.schema.string().optional(),
  rule_id: tool.schema.string().optional(),
  rule_version: tool.schema.string().optional(),
  fingerprint: tool.schema.string().optional(),
  source: tool.schema.enum(["scanner", "adapter", "analyzer", "user"]).optional(),
})

const taxonomySchema = tool.schema.object({
  name: tool.schema.string(),
  id: tool.schema.string(),
  relationship: tool.schema.enum(["equal", "subset", "superset", "relevant"]).optional(),
  source: tool.schema.enum(["scanner", "adapter", "analyzer", "user"]),
})

const semanticCandidateSchema = tool.schema.object({
  display_type: tool.schema.string(),
  confidence: tool.schema.enum(["HIGH", "MEDIUM", "LOW"]),
  evidence: tool.schema.array(tool.schema.string()).optional(),
})

export const autofixRouteTool = tool({
  description:
    "根据 Finding 证据及已确认的语言/框架，一次完成确定性 Repair Catalog 路由。仅有模型语义候选时强制人工复核。",
  args: {
    analysis_verdict: tool.schema
      .enum(["VULNERABLE", "NOT_VULNERABLE", "PARTIAL", "NEED_CONTEXT"])
      .describe("vuln-analyzer 的真实性结论；只有 VULNERABLE 可以进入自动路由"),
    analysis_confidence: tool.schema
      .enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"])
      .describe("vuln-analyzer 对真实性结论的置信度；只有 HIGH 可以确定性路由"),
    rule: ruleSchema.optional(),
    taxonomies: tool.schema.array(taxonomySchema).optional(),
    raw_type: tool.schema.string().optional(),
    raw_type_source: tool.schema.enum(["scanner", "adapter", "analyzer", "user"]).optional(),
    semantic_candidates: tool.schema.array(semanticCandidateSchema).optional(),
    language: tool.schema.string().optional().describe("已确认的语言；未知时不要猜测"),
    framework: tool.schema.string().optional().describe("已确认的框架/组件；未知时不要猜测"),
  },
  async execute(args) {
    return JSON.stringify(routeFinding(args))
  },
})
