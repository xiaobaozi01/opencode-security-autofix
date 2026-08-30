# Security AutoFix

Security AutoFix 是一个由 Agent、Subagent 和领域 Skill 组成的防御性安全修复工具包。它使用宿主提供的文件读取、代码搜索、编辑、终端和委派能力，完成安全问题标准化、真实性分析、最小修复、验证、裁决和报告。

## 目录

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
├── commands/
│   ├── security-fix.md
│   ├── security-fix-report.md
│   └── security-verify.md
└── skills/
    ├── fix-injection/
    ├── fix-xml-deserialization/
    ├── fix-web-security/
    ├── fix-request-security/
    ├── fix-auth-security/
    ├── fix-crypto-secret/
    ├── fix-code-security/
    └── fix-dependency-config/
```

## 工作流

```text
security-autofix
    ↓
report-analyzer
    ↓
vuln-analyzer
    ↓
fix-planner
    ↓
fix-validator (preflight)
    ↓
code-fixer
    ↓
fix-validator (post_patch)
    ↓
final-judge
    ↓
result-reporter
```

各 Subagent 使用严格 JSON 交接结果。主 Agent 负责维持 Finding、分析、计划、补丁和验证证据之间的一致性。

## 使用

将 `.opencode/` 合并到目标项目，然后使用：

```text
/security-fix <漏洞描述、Finding 或文件位置>
/security-fix-report <扫描报告路径>
/security-verify <已有补丁和补丁前历史报告>
```

也可以直接选择 `security-autofix` Agent 并提供同类输入。

## 输入

支持：

- 用户描述的安全问题；
- SARIF、JSON、CSV、Markdown 或文本扫描报告；
- Scanner Finding、CWE、Rule ID、文件和行号；
- 需要验证的已有安全补丁。

报告过大、内容截断或格式无法可靠理解时，工作流会明确标记警告并停止自动修复相关 Finding。

## 命令发现

Build、Test 和 Scanner 命令只能来自：

1. 用户明确提供；
2. 仓库 README、开发说明或 Agent 指令；
3. `package.json`、`pom.xml`、Gradle、Makefile、CI 等项目已有配置。

命令不明确时会请求确认。工具包不会自行安装依赖，也不会执行发布、部署、数据库迁移、远程写入或 Secret 操作。

## 自动修改条件

只有同时满足以下条件才进入代码修改：

- 漏洞真实性为 `VULNERABLE`；
- 分析置信度为 `HIGH`；
- 领域 Skill 中存在明确匹配的 strategy；
- 可修复性为 `AUTO_FIX` 或 `AUTO_FIX_WITH_REVIEW`；
- 工作区修改范围可区分；
- 补丁前 Finding 能在可信 baseline 中确认；
- 存在足够的验证路径。

其中 `AUTO_FIX` 可以在全部 Gate 通过后自动接受；`AUTO_FIX_WITH_REVIEW` 只允许生成和验证候选补丁，本次运行最终必须为 `HUMAN_REVIEW`，等待人工确认后再决定是否保留。

否则返回 `HUMAN_REVIEW`、`GUIDANCE_ONLY`、`NOT_SUPPORTED` 或 `FALSE_POSITIVE`。

## Finding 比较

安全重扫遵循保守原则：

- 相同 Scanner、Rule 和稳定 Fingerprint 再次出现：`PRESENT`；
- 相同扫描范围内稳定 Fingerprint 消失：`ABSENT`；
- 只有 Finding ID、标题、位置或行号时，消失：`INDETERMINATE`；
- 扫描失败、范围变化或报告不完整：`INDETERMINATE` 或 `NOT_RUN`。

`NOT_RUN` 和 `INDETERMINATE` 都不能视为通过。

## 最终裁决

必要 Gate 包括：

- Analysis
- Patch Scope
- Security Review
- Build
- Tests
- Rescan
- Regression Review

任一 Gate 失败或 Rescan 为 `PRESENT` 时结论为 `FIX_REJECTED`；没有失败但存在未执行、不确定或警告时结论为 `HUMAN_REVIEW`；只有普通 Gate 全部 `PASS` 且 Rescan 为 `ABSENT` 时才允许 `FIX_ACCEPTED`。

## 工作区安全

建议在干净的 Git 工作区或独立 worktree 中运行。工作流会在修改前后检查 `git status` 和 `git diff`，并拒绝计划外修改。失败补丁不会自动执行破坏性恢复；报告会列出修改范围，由用户决定保留或恢复。

## 修复报告

每次任务生成一份：

```text
security-autofix-results/security-autofix-result-YYYY-MM-DD-HH-mm-ss.md
```

报告包含全部 Finding、根因、策略、修改文件、验证命令和证据、未执行项、剩余风险、人工检查项及工作区处置状态。
