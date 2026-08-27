# OpenCode Security AutoFix 工具包

面向 OpenCode 的防御性安全漏洞自动修复工具包。当前版本采用 **Agent/Skill 声明层 + Local Plugin 运行时层**，可以直接合并进团队已有 `.opencode/` 工具库，不再要求项目根目录保留独立 `security-autofix/` 目录。

## 1. 目录结构

```text
.opencode/
├── agents/
│   ├── security-autofix.md
│   ├── report-analyzer.md
│   ├── vuln-analyzer.md
│   ├── fix-planner.md
│   ├── code-fixer.md
│   ├── fix-validator.md
│   ├── final-judge.md
│   └── result-reporter.md
├── skills/
│   ├── fix-injection/
│   ├── fix-xml-deserialization/
│   ├── fix-web-security/
│   ├── fix-request-security/
│   ├── fix-auth-security/
│   ├── fix-crypto-secret/
│   ├── fix-code-security/
│   └── fix-dependency-config/
├── commands/
│   ├── security-fix.md
│   ├── security-fix-report.md
│   └── security-verify.md
├── plugins/
│   └── security-autofix.ts
├── tests/
│   ├── build-task.test.ts
│   ├── catalog.test.ts
│   ├── routing.test.ts
│   ├── delimited.test.ts
│   ├── report-adapters.test.ts
│   ├── scanner-outcome.test.ts
│   └── package.json
├── lib/
│   └── security-autofix/
│       ├── api.ts
│       ├── config.ts
│       ├── contracts.ts
│       ├── finding/
│       ├── repair/
│       ├── report/
│       ├── scanner/
│       └── tools/
└── security-autofix.json
```

OpenCode 会自动加载 `.opencode/plugins/security-autofix.ts`。Plugin 对 Agent 暴露以下确定性 Tool：

- `autofix_report`：扫描报告解析。
- `autofix_route`：根据 Finding 证据、语言和框架一次返回 Repair Provider/strategy。
- `autofix_scan`：调用扫描器重扫。
- `autofix_compare`：使用稳定 Finding 身份比较修复前基线和修复后报告。
- `autofix_build`：列出或执行项目配置的命名 Build/Test Task。
- `autofix_patch`：管理 Patch Batch 快照、封存、接受和回滚。
- `autofix_result`：生成最终 Markdown。

`.opencode/lib/security-autofix/` 是 Plugin 私有运行时实现，不需要 Agent 直接读取。

## 2. 为什么改成 Plugin

职责分为三层：

```text
Agent / Skill / Command
        ↓
Security AutoFix Plugin
        ↓
Adapter / Catalog / Tool / Contract
```

这样团队公共工具包只需要合并 `.opencode/`，不会在项目根目录再出现一套独立运行时目录。

## 3. Agent 流程

```text
security-autofix
    ↓
report-analyzer
    ↓
vuln-analyzer
    ↓
fix-planner
    ↓
fix-validator (preflight + baseline)
    ↓
autofix_patch begin
    ↓
code-fixer
    ↓
autofix_patch seal
    ↓
fix-validator (post_patch)
    ↓
final-judge
    ↓
autofix_patch accept / rollback
    ↓
result-reporter
```

Agent 合并只减少编排复杂度，不删除安全验证 Gate。`fix-validator` 修改前确认基线 Finding，修改后分别记录 Security Review、Build、Test、Targeted Rescan Compare 和 Regression Review。只有接受的 Patch Batch 会保留在工作区。

## 4. Repair Skill

36 类漏洞修复知识合并为 8 个领域 Skill。Agent 负责语义分析，Plugin 只保留一个确定性 Repair 路由边界：

```text
Report Adapter 提取的 Rule / Taxonomy / raw_type
          + Agent semantic_candidates
          + analysis_verdict
          + 已确认的 language / framework
                          ↓
                    autofix_route
                          ↓
      status + repair_entry_id + provider + strategy
```

Router 不使用人为数字评分，而是按 Scanner Rule -> 可信 Taxonomy -> 扫描器原始 Alias 的显式优先级处理。只有 `VULNERABLE` 能进入自动路由；`NOT_VULNERABLE` 返回 `FALSE_POSITIVE`，`PARTIAL | NEED_CONTEXT` 返回 `HUMAN_REVIEW`。`source=analyzer` 或 `relationship=relevant|superset` 的 Taxonomy 不具备确定性路由权限。同一级多路由命中返回 `AMBIGUOUS`；只有 Agent 语义候选时返回 `HUMAN_REVIEW`。

新协议不兼容上一版：`autofix_classify`、`autofix_repair` 和 `StandardVulnerability.classification` 已删除；Agent 与扩展必须使用 `autofix_route` 和 `semantic_candidates`。

例如 `SQL_INJECTION` 会路由到：

```text
provider = fix-injection
strategy = sql-injection
```

普通新增漏洞不需要新增 Skill：优先在现有领域 Skill 增加 strategy，并注册一条 Repair Entry。只有出现新的安全领域时才增加新 Skill。

## 5. 项目配置

只保留一个项目配置文件：

```text
.opencode/security-autofix.json
```

默认内容已经包含 Scanner 和结果目录配置。没有配置真实扫描命令时，Preflight 返回 `NOT_RUN` 并阻止自动修改，不会伪造 `PASS`。

结果报告默认写入：

```text
security-autofix-results/
└── security-autofix-result-YYYY-MM-DD HH-mm-ss.md
```

报告正文时间使用 `YYYY-MM-DD HH:mm:ss`，文件名强制由 Tool 使用运行机器本地时间生成，调用方不能指定文件名。
同一秒内并发生成报告时不会覆盖已有文件，后续报告会追加 `-01`、`-02` 等序号。

自动修改使用绑定稳定 `finding_key` 的 Patch Batch。`begin` 快照计划文件，`seal` 固定验证对象，最终只有 `FIX_ACCEPTED` 调用 `accept`；`FIX_REJECTED | HUMAN_REVIEW` 调用 `rollback`。Accept/Rollback 会生成本地 Receipt，`autofix_result` 必须核验真实 `batch_id + finding_key + status` 后才写报告。

最终裁决硬规则：任一必要 Gate 失败或 Rescan 为 `PRESENT` 时必须拒绝；没有失败但存在 `NOT_RUN | UNKNOWN | INDETERMINATE | WARN` 时必须人工审核；只有全部必要 Gate 为 `PASS`、Rescan 为 `ABSENT`、Route 为 `MATCHED` 且 Patch Receipt 为 `ACCEPTED` 时才能报告 `FIX_ACCEPTED`。`VERIFY` 模式验证已有补丁时使用 `patch_batch.status=EXISTING`。

## 6. Report Adapter 扩展

内置：SARIF、JSON、CSV/TSV、Text/Markdown。

核心 Plugin 导出了注册 API。公司私有 Report Adapter 不需要修改核心 Registry，可以新增独立插件，例如：

```typescript
// .opencode/plugins/company-security-report.ts
import { type Plugin } from "@opencode-ai/plugin"
import {
  registerReportAdapter,
  type ReportAdapter,
} from "../lib/security-autofix/api"

const securityTestReportAdapter: ReportAdapter = {
  id: "security-test",
  priority: 200,
  supports(input) {
    return input.extension === ".json" && input.text.includes('"securityTest"')
  },
  parse(input) {
    const raw = JSON.parse(input.text)
    return {
      report: {
        path: input.filePath,
        scanner: "security-test",
        adapter: "security-test",
      },
      findings: (raw.findings ?? []).map((finding) => ({
        original_id: finding.id,
        rule: {
          scanner: "security-test",
          rule_id: finding.ruleId,
        },
        taxonomies: (finding.cwes ?? []).map((id) => ({
          name: "CWE",
          id,
          source: "scanner",
        })),
        raw_type: finding.category,
        title: finding.title,
        description: finding.description,
        severity: finding.severity,
        location: finding.location,
        raw: finding,
      })),
      warnings: [],
    }
  },
}

export const CompanySecurityReportPlugin: Plugin = async () => {
  registerReportAdapter(securityTestReportAdapter)
  return {}
}
```

这就是新的扩展模式：**扩展插件注册 Adapter，核心 AutoFix Plugin 不修改。**

## 7. Scanner Adapter 扩展

内置 `command` Scanner Adapter。若公司扫描平台采用“创建任务 -> 轮询 -> 下载报告”，可以通过另一个 OpenCode Plugin 注册：

```typescript
// .opencode/plugins/company-security-scanner.ts
import { type Plugin } from "@opencode-ai/plugin"
import {
  registerScannerAdapter,
  type ScannerAdapter,
} from "../lib/security-autofix/api"

const scanner: ScannerAdapter = {
  id: "security-test",
  async scan(config, request, context) {
    // 创建任务、轮询状态、下载报告。
    return {
      status: "EXECUTED",
      scanner: "security-test",
      adapter: "security-test",
      reportPath: "reports/security-test-result.json",
      reportAdapter: "security-test",
    }
  },
}

export const CompanySecurityScannerPlugin: Plugin = async () => {
  registerScannerAdapter(scanner)
  return {}
}
```

Targeted Scan 请求使用 `repairEntryId`、`ruleId`、`findingId`。`command` Adapter 对应支持 `{repairEntryId}`、`{ruleId}`、`{findingId}`、`{output}` 占位符。

自动修复必须在修改前保存基线扫描报告，修改后使用 `autofix_compare` 比较。只有修复前基线为 `PRESENT`，并且修复后基于稳定 Fingerprint 得到 `ABSENT`，Rescan Gate 才能通过。弱 Finding ID 或位置在重扫中消失只能得到 `INDETERMINATE`。

然后修改 `.opencode/security-autofix.json`：

```json
{
  "scanner": {
    "adapter": "security-test",
    "reportAdapter": "security-test"
  },
  "results": {
    "outputDir": "security-autofix-results",
    "writeJsonSidecar": false
  }
}
```

## 8. Repair Provider 扩展

Repair Catalog 也支持插件注册。新增普通漏洞时：

1. 在对应领域 Skill 增加 strategy 章节。
2. 通过扩展 Plugin 调用 `registerRepairEntry()` 注册路由。

```typescript
import { type Plugin } from "@opencode-ai/plugin"
import { registerRepairEntry } from "../lib/security-autofix/api"

export const CompanyRepairExtension: Plugin = async () => {
  registerRepairEntry({
    id: "graphql-injection.generic",
    display_type: "GRAPHQL_INJECTION",
    matchers: {
      scanner_rules: [{ scanner: "company-sast", rule_id: "graphql-injection" }],
      aliases: ["GRAPHQL_INJECTION", "GRAPHQL_INJECTION_RISK"],
    },
    provider: "fix-injection",
    strategy: "graphql-injection",
    name_zh: "GraphQL 注入",
    supported_languages: ["*"],
    supported_frameworks: ["*"],
    default_fixability: "AUTO_FIX_WITH_REVIEW",
    validators: ["security-review", "build", "test", "targeted-rescan", "regression-review"],
  })
  return {}
}
```

## 9. Build/Test 验证

`autofix_build` 不再内置 Maven、Gradle、Node 或 Python Adapter，也不自动生成构建命令。项目在 `.opencode/security-autofix.json` 中定义命名 Task：

```json
{
  "build": {
    "tasks": {
      "backend-build": {
        "kind": "build",
        "description": "构建后端 Maven 模块",
        "paths": ["backend/**", "pom.xml"],
        "command": ["./mvnw", "-pl", "backend", "{args}", "package"],
        "timeoutMs": 900000,
        "env": {
          "CI": "true"
        }
      },
      "backend-test": {
        "kind": "test",
        "paths": ["backend/**"],
        "command": ["./mvnw", "-pl", "backend", "{args}", "test"]
      },
      "frontend-build": {
        "kind": "build",
        "cwd": "frontend",
        "paths": ["frontend/**"],
        "command": ["pnpm", "build", "{args}"]
      }
    }
  }
}
```

Task 字段：

- `kind`：必填，`compile | build | test`，用于区分验证 Gate。
- `command`：必填 argv 数组，第一项是可执行程序。
- `cwd`：可选项目内目录；省略或空字符串时使用项目根目录。
- `paths`：可选文件模式，供 Agent 根据修改文件选择 Task；不影响执行目录。
- `description`：可选说明，只用作选择辅助信息。
- `env`、`timeoutMs`：可选默认环境变量和超时时间。

不传 `task` 时只列出任务：

```json
{}
```

执行任务并传入 Maven settings：

```json
{
  "task": "backend-build",
  "args": ["-s", "${userHome}/.m2/settings.xml", "-Pcompany"]
}
```

`{args}` 必须是独立数组元素，最多出现一次；未传参数时删除，命令中没有 `{args}` 时将运行参数追加到末尾。`${workspaceFolder}`、`${userHome}` 和 `~/` 可用于 `cwd`、`command` 和运行参数。

Task ID 由项目维护者定义，Agent 不得在运行时创造。选择顺序是：用户指定 -> `kind` -> 修改文件匹配 `paths` -> 唯一候选。仍有歧义时返回 `NOT_RUN`并列出候选，不根据描述猜测。

## 10. 开发测试

运行环境需要 Node.js 22 或更高版本：

```bash
cd .opencode/tests
npm test
```

48 个测试覆盖 Build Task、Patch Batch 回滚与冲突保护及 Receipt 校验、Finding 基线/重扫比较、最终裁决硬校验、36 条 Repair Entry、Rule/Taxonomy/Alias 路由优先级、真实性与 Taxonomy 信任边界、内置报告 Adapter、CSV/TSV 和 Scanner 状态判定。

## 11. 使用

直接修复漏洞：

```text
/security-fix SQL Injection: src/main/resources/mapper/UserMapper.xml:35 存在 ${orderBy}
```

处理扫描报告：

```text
/security-fix-report reports/security-result.sarif
```

验证已有补丁：

```text
/security-verify CWE-89 修复，重点检查 UserMapper.xml 和 UserService.java
```

## 12. 合并到团队工具包

把本工具包 `.opencode/` 下对应目录合并到团队已有 `.opencode/` 即可。生产运行不需要额外复制项目根目录业务文件夹。

如果未来希望独立版本化、跨多个团队仓库复用，可以把 `.opencode/lib/security-autofix/` 和 `.opencode/plugins/security-autofix.ts` 抽取成 `@company/opencode-security-autofix` npm Plugin；当前 Agent/Skill/Command 无需因此重写。
