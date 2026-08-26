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
│   ├── build-command.test.ts
│   ├── catalog.test.ts
│   ├── delimited.test.ts
│   ├── report-adapters.test.ts
│   ├── result-file.test.ts
│   ├── scanner-outcome.test.ts
│   └── package.json
├── lib/
│   └── security-autofix/
│       ├── api.ts
│       ├── config.ts
│       ├── contracts.ts
│       ├── repair/
│       ├── report/
│       ├── scanner/
│       └── tools/
└── security-autofix.json
```

OpenCode 会自动加载 `.opencode/plugins/security-autofix.ts`。Plugin 对 Agent 暴露以下确定性 Tool：

- `autofix_report`：扫描报告解析。
- `autofix_scan`：调用扫描器重扫。
- `autofix_build`：受限 Build/Test，支持 Maven、Gradle、Node、Python、Go 和 .NET。
- `autofix_result`：生成最终 Markdown。
- `autofix_repair`：Repair Catalog 路由。

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
code-fixer
    ↓
fix-validator
    ↓
final-judge
    ↓
result-reporter
```

Agent 合并只减少编排复杂度，不删除安全验证 Gate。`fix-validator` 内仍分别记录 Security Review、Build、Test、Targeted Rescan 和 Regression Review。

## 4. Repair Skill

36 类漏洞修复知识合并为 8 个领域 Skill。Repair 路由由 Plugin 内部 Catalog 完成：

```text
漏洞 type + language + framework
              ↓
        autofix_repair
              ↓
        Repair Catalog
              ↓
领域 Repair Skill + strategy
```

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

默认内容已经包含 Scanner 和结果目录配置。没有配置真实扫描命令时，Rescan 返回 `NOT_RUN`，不会伪造 `PASS`。

结果报告默认写入：

```text
security-autofix-results/
└── security-autofix-result-YYYY-MM-DD HH-mm-ss.md
```

报告正文时间使用 `YYYY-MM-DD HH:mm:ss`，文件名强制由 Tool 使用运行机器本地时间生成，调用方不能指定文件名。
同一秒内并发生成报告时不会覆盖已有文件，后续报告会追加 `-01`、`-02` 等序号。

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
      findings: raw.findings ?? [],
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
    type: "GRAPHQL_INJECTION",
    provider: "fix-injection",
    strategy: "graphql-injection",
    name_zh: "GraphQL 注入",
    priority: 100,
    supported_languages: ["*"],
    supported_frameworks: ["*"],
    default_fixability: "AUTO_FIX_WITH_REVIEW",
    validators: ["security-review", "build", "test", "targeted-rescan", "regression-review"],
  })
  return {}
}
```

## 9. Build/Test 验证

`autofix_build` 默认使用 `ecosystem=auto`，按 Maven、Gradle、Node、Python、Go、.NET 的顺序检测项目。多语言仓库应由 `fix-validator` 根据已确认的代码上下文显式指定：

```text
ecosystem = maven | gradle | node | python | go | dotnet
```

针对性测试通过 `test` 参数传递：Maven 使用 `-Dtest`，Gradle 使用 `--tests`，Node 追加到测试脚本参数，Python 传给 pytest，Go 使用 `-run`，.NET 使用 `--filter`。

只有检测到对应脚本或构建文件时才会执行；无法执行返回 `NOT_RUN`。

## 10. 开发测试

运行环境需要 Node.js 22 或更高版本：

```bash
cd .opencode/tests
npm test
```

测试覆盖 Build/Test 命令解析、36 条 Repair 路由、内置报告 Adapter、CSV/TSV、多报告命名和 Scanner 状态判定。

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
