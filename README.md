# Security AutoFix

Security AutoFix 是一个由 Agent、Subagent 和领域 Skill 组成的防御性安全 Patch 工具包。它负责标准化安全问题、分析真实性、制定最小修复方案，并在隔离 Git worktree 中为每个 Finding 生成和验证独立 Patch。

工具包不会把 Patch 应用到目标项目。主工作区的源码、测试、配置和 Git index 始终保持不变。

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
fix-validator (task_preflight)
    ↓
vuln-analyzer → fix-planner
    ↓
同一个 task_start_head
├── finding-001 worktree → code-fixer → validate_patch → finding-001.patch
├── finding-002 worktree → code-fixer → validate_patch → finding-002.patch
└── finding-003 worktree → code-fixer → validate_patch → finding-003.patch
    ↓
final-judge（逐 Patch）→ result-reporter（一次总报告）

主工作区：不编辑、不应用 Patch、不运行候选 Build/Test
```

每个 Finding 都有独立 Worktree、独立 Diff、独立验证证据和独立 Patch Artifact。不同 Finding 可以并行处理，不共享可写代码目录。

## 使用

将 `.opencode/` 合并到目标项目，并在目标项目的 `.gitignore` 中加入：

```text
security-autofix-results/
```

然后使用：

```text
/security-fix <漏洞描述、Finding 或文件位置>
/security-fix-report <扫描报告路径>
/security-verify <已有 Patch、Diff 和补丁前证据>
```

也可以直接选择 `security-autofix` Agent 并提供同类输入。

## 输入

支持：

- 用户描述的安全问题；
- SARIF、JSON、CSV、Markdown 或文本扫描报告；
- Scanner Finding、CWE、Rule ID、文件和行号；
- 需要只读验证的已有安全 Patch。

报告过大、内容截断或格式无法可靠理解时，工作流会明确标记警告，并停止为相关 Finding 自动生成 Patch。

## Patch-only 模型

`AUTOFIX` 模式要求目标目录是 Git 仓库、主工作区完全干净，并且结果目录已被 Git 忽略。验证器记录统一的 `task_start_head`，之后：

1. 为每个 Finding 分配任务内标识 `finding-001`、`finding-002` 等。外部 Finding ID 和用户输入不会直接进入路径。
2. 每个 Finding 从同一个 `task_start_head` 创建独立 detached worktree。
3. `code-fixer` 只修改对应 Worktree 中计划内的源码和安全回归测试。
4. `fix-validator` 在该 Worktree 中审查完整 Diff，并执行来源明确的 Build/Test 命令。
5. 每个 Finding 导出到：

```text
security-autofix-results/patches/<run-id>/<finding-key>.patch
```

6. 工具包不执行 `git apply`，也不把任何 Worktree 修改复制回主工作区。

唯一允许写入主工作区目录的内容是已忽略的结果目录，其中包含 Worktree、Patch Artifact 和最终报告。

## 命令发现和 Worktree 验证

Build 和 Test 命令只能来自：

1. 用户明确提供；
2. 仓库 README、开发说明或 Agent 指令；
3. `package.json`、`pom.xml`、Gradle、Makefile、CI 等项目已有配置。

验证器把每条命令的工作目录明确设置为对应 Worktree，并记录命令来源、工作目录、退出码和输出摘要。Security Review、Build、Test、安全回归测试和 Regression Review 全部在该 Worktree 中完成，候选命令不会在主工作区运行。

缺少依赖、环境变量、服务、数据库或 Secret 时，不自动安装或补造环境；相关 Gate 使用 `NOT_RUN`。工具包不会执行发布、部署、数据库迁移、远程写入或 Secret 操作。

## Patch 生成条件

只有同时满足以下条件才允许在隔离 Worktree 中生成 Patch：

- 漏洞真实性为 `VULNERABLE`；
- 分析置信度为 `HIGH`；
- 领域 Skill 中存在明确匹配的 strategy；
- 可修复性为 `AUTO_FIX` 或 `AUTO_FIX_WITH_REVIEW`；
- 补丁前 Finding 能在可信 baseline 中确认；
- 计划文件和验证路径足够明确；
- 主工作区满足 Patch-only preflight。

`AUTO_FIX` 可以在全部 Gate 通过后得到 `PATCH_READY`。`AUTO_FIX_WITH_REVIEW` 只允许生成和验证 Patch Artifact，即使自动验证全部通过也仍为 `HUMAN_REVIEW`。

其他情况返回 `HUMAN_REVIEW`、`GUIDANCE_ONLY`、`NOT_SUPPORTED` 或 `FALSE_POSITIVE`。

## 补丁前证据与安全回归

本工具包不执行 Rescan。Scanner 报告仅作为输入和补丁前 baseline，最终报告不会声称 Scanner 已确认 Finding 消失。

没有 Scanner 时，补丁前 baseline 可以是 `vuln-analyzer` 对 `task_start_head` 代码给出的 `VULNERABLE/HIGH` 和具体 `file:line` 证据，类型记录为 `MANUAL_CODE_EVIDENCE`。它只能证明修改前代码存在漏洞，不能伪装成 Scanner 报告。

修复后的安全证据来自 Worktree 中的代码安全审查、构建、测试和直接覆盖原危险路径的安全回归测试。`security_regression_coverage` 必须为 `COVERED` 才可能输出 `PATCH_READY`。

## Patch 裁决

每个 Finding 的 Patch 单独裁决，状态只能是：

- `PATCH_READY`
- `PATCH_REJECTED`
- `HUMAN_REVIEW`
- `FALSE_POSITIVE`
- `GUIDANCE_ONLY`
- `NOT_SUPPORTED`

必要 Gate 包括 Analysis、Patch Scope、Security Review、Build、Tests 和 Regression Review，安全回归覆盖还必须为 `COVERED`。

任一必要 Gate 失败，或者 Patch 缺失、为空、截断、基准不一致、包含计划外文件时，结论为 `PATCH_REJECTED`。没有失败但存在未执行、不确定或警告时，结论为 `HUMAN_REVIEW`。

`PATCH_READY` 只表示该 Patch 在自己的 Worktree 中相对于记录的 `task_start_head` 独立验证通过。它不表示：

- Patch 已应用到目标项目；
- Scanner 已确认告警消失；
- 多个 Patch 可以无冲突地组合；
- 组合后的项目仍能构建或通过测试。

## 多 Patch 交互风险

每个 FixPlan 都记录可能重叠的文件、符号、组件、Source/Sink、安全组件和根因。Patch 生成后还会比较实际变更文件和 Hunk，并在报告中为每个 Patch 列出：

- `overlaps_with`
- 重叠文件、Hunk、符号或组件
- `combination_risk: NONE_KNOWN | HUMAN_REVIEW_REQUIRED`

即使两个 Finding 相互影响，它们仍然分别生成 Patch。存在重叠时，单个 Patch 仍可独立裁决，但组合状态固定为 `NOT_VALIDATED`，需要用户自行决定应用顺序、重新整合并在最终代码上重新测试。

## Worktree 和 Artifact

Worktree 位于：

```text
security-autofix-results/worktrees/<run-id>/<finding-key>
```

Worktree 中不 commit、不创建分支、不 stash、不 reset。验证器只允许对计划内新增文件执行精确的 `git add -N`，以便新增文件进入导出的 Diff；不会暂存文件内容。

默认保留带候选修改的 Worktree，便于复核 Patch 和验证证据。只有用户明确批准后才执行精确的 Worktree 删除和 prune。无论 Worktree 是否保留，主工作区都不会应用候选修改。

## 修复报告

每次任务生成一份：

```text
security-autofix-results/security-autofix-result-YYYY-MM-DD-HH-mm-ss.md
```

报告包含全部 Finding、`finding_key`、根因、策略、Patch 路径和 SHA-256、变更文件、Worktree 验证命令和证据、未执行项、`overlaps_with`、组合风险、剩余风险及人工检查项，并明确声明主工作区未被修改。
