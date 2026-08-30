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
fix-validator (task_preflight)
    ↓
单 Finding：code-fixer → post_patch
多 Finding：Cluster → detached worktrees → candidate patches
    ↓
主工作区串行集成 → fix-validator (final_batch)
    ↓
final-judge → result-reporter
```

各 Subagent 使用严格 JSON 交接结果。主 Agent 负责维持 Finding、分析、计划、补丁和验证证据之间的一致性。

## 使用

将 `.opencode/` 合并到目标项目。需要处理多 Finding 时，还应在目标项目的 `.gitignore` 中加入 `security-autofix-results/`，然后使用：

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

任一 Gate 失败或 Rescan 为 `PRESENT` 时结论为 `FIX_REJECTED`；没有失败但存在未执行、不确定或警告时结论为 `HUMAN_REVIEW`；只有 `fixability=AUTO_FIX`、普通 Gate 全部 `PASS` 且 Rescan 为 `ABSENT` 时才允许 `FIX_ACCEPTED`。`AUTO_FIX_WITH_REVIEW` 即使自动验证全部通过也仍为 `HUMAN_REVIEW`。

## 工作区安全

建议在干净的 Git 工作区或独立 worktree 中运行。工作流会在修改前后检查 `git status` 和 `git diff`，并拒绝计划外修改。失败补丁不会自动执行破坏性恢复；报告会列出修改范围，由用户决定保留或恢复。

## 多 Finding 并行 Worktree

同一输入包含多条 Finding 时，自动修改必须使用 `PARALLEL_WORKTREE`，不得让多个修复 Agent 共享主工作区：

1. 在任务起始 `HEAD` 上完成只读分析和计划，根据文件、符号、组件、Source/Sink、安全组件和根因聚类。
2. 每个 Cluster 创建在 `security-autofix-results/worktrees/<run-id>/<cluster-id>` 下的 detached Git worktree。不同 Cluster 可以并行，Cluster 内必须串行。
3. Worktree 中不 commit、不创建分支、不 stash；验证器将完整 Diff 导出到 `security-autofix-results/patches/<run-id>/<cluster-id>.patch`。
4. 主工作区重新分析每个候选影响。已被先前 Patch 解决的 Finding 记录 `RESOLVED_BY_PRIOR_PATCH` 和 `patch_owner`，不重复应用。
5. 其余 Patch 必须先通过 `git apply --check`，再经用户批准串行执行 `git apply`；禁止 `--3way`、强制应用和自动解决冲突。
6. 全部候选处理后在主工作区执行一次 `final_batch`，重新完成累计 Patch Scope、Build、Test、完整 Rescan 和 Regression Review，然后才进行最终裁决。

多 Finding Worktree 模式要求任务开始时工作区完全干净、结果目录已被 Git 忽略且用户能够逐次审批状态变更命令。不满足时返回 `HUMAN_REVIEW`。不得为此模式主动启用 OpenCode `--auto`；它会自动批准原本需要确认的 Worktree、Patch 写入和集成命令。候选 Worktree 可能缺少未跟踪依赖；工具包不会为此自动安装依赖，相关候选 Gate 使用 `NOT_RUN`，最终以主工作区验证为准。

成功集成后不会自动强制删除带未提交补丁的 Worktree。报告会列出保留路径；只有用户明确批准后才执行精确的 `git worktree remove --force <path>` 和 `git worktree prune`。

## 修复报告

每次任务生成一份：

```text
security-autofix-results/security-autofix-result-YYYY-MM-DD-HH-mm-ss.md
```

报告包含全部 Finding、根因、策略、修改文件、验证命令和证据、未执行项、剩余风险、人工检查项及工作区处置状态。
