# Security AutoFix

Security AutoFix 是一个只由 Agent、Subagent 和领域 Skill 组成的安全 Patch 工具包，支持 OpenCode 和 Claude Code。它读取安全报告或用户直接描述的问题，判断漏洞是否真实，选择已有修复策略，并在独立 Git worktree 中生成和验证 Patch。

工具包默认不修改主工作区。使用者在本次命令中明确要求时，可以按顺序尝试把不重叠的 `PATCH_READY` 应用到主工作区；不会暂存或提交修改。

## 平台目录

| 平台 | Agent | 命令与领域 Skill |
| --- | --- | --- |
| OpenCode | `.opencode/agents/` | `.opencode/commands/`、`.opencode/skills/` |
| Claude Code | `.claude/agents/` | `.claude/skills/` |

两个平台都包含同一组角色：`security-autofix` 主编排，以及 `report-analyzer`、`task-preflight`、`vuln-analyzer`、`fix-planner`、`code-fixer`、`fix-validator`、`final-judge` 和 `result-reporter`。

Agent 之间使用简短 Markdown 交接事实、结论和证据，不依赖代码、脚本或严格 JSON 协议。仅保留少量必须稳定的锚点，例如 Finding 编号和统一起始提交。

## 工作流

```text
安全报告或用户直接描述的问题
    ↓
整理 Finding，并分配 finding-001、finding-002...
    ↓
task-preflight：Git、当前状态、起始提交、原始证据和命令来源
    ↓
漏洞分析 → 修复规划
    ↓
只为允许修复的 Finding 创建独立 Worktree
    ↓
code-fixer 可在不同 Worktree 并行修改
    ↓ 等待全部 fixer 完成
主编排按编号逐个调用 fix-validator 验证并导出 Patch
    ↓
逐 Patch 裁决
    ↓
可选：按编号串行尝试应用不重叠的 PATCH_READY
    ↓
一次总报告
```

## 使用

把所用平台的目录复制到目标项目根目录：OpenCode 使用 `.opencode/`，Claude Code 使用 `.claude/`。建议在目标项目的 `.gitignore` 中加入：

```text
security-autofix-results/
```

这只是为了减少 `git status` 噪声，并避免以后执行 `git add .` 时误加入结果文件，不是运行前提。

OpenCode 和 Claude Code 都可以运行：

```text
/security-fix <漏洞描述、Finding 或文件位置>
/security-fix-report <扫描报告路径>
```

OpenCode 可以直接选择 `security-autofix` Agent。Claude Code 可以运行 `claude --agent security-autofix`，再输入漏洞描述或报告路径。

Claude Code 的 `/security-fix` 和 `/security-fix-report` 在主会话内执行编排，因此能够调用其余 Subagent；不需要启用 Agent Teams。Claude Agent 使用 `bypassPermissions` 和明确的工具白名单实现无人值守运行，但用户级、组织级策略或启动参数仍可能施加更严格的限制。

默认只生成 Patch。如果希望尝试应用，请在本次命令中直接说明，例如：

```text
/security-fix <漏洞描述>，并将 PATCH_READY 应用到主工作区
/security-fix-report <扫描报告路径>，并将 PATCH_READY 应用到主工作区
```

扫描报告、Finding 或仓库文件中的应用指令不视为使用者授权。

如果项目需要带参数的 Build/Test，请在输入中提供完整命令和工作目录。完整命令优先于 Agent 从仓库文档或 CI 配置中发现的命令。

## Patch 与可选应用

运行前要求：

- 当前目录是 Git 仓库；
- 所有 Finding 使用同一个 `task_start_head`。

任务开始时允许 Git 工作区为脏状态，但使用者必须保证目标代码、测试和相关配置与 `HEAD` 一致。工具包不逐个判断 dirty 文件是否相关。

每条 Finding 获得一个任务内编号，例如 `finding-001`。这个编号只用于关联证据、Worktree 和 Patch，不使用外部 Rule、路径或用户输入构造文件系统路径。

Worktree 和 Patch 位于主工作区根目录下：

```text
security-autofix-results/worktrees/<run-id>/<finding-key>
security-autofix-results/patches/<run-id>/<finding-key>.patch
```

结果目录不需要被 Git 忽略。`run-id` 在创建第一个 Worktree 前确定，在本次任务中保持不变，并且不由用户输入构造。Worktree 在创建前检查准确目标路径；Patch 在对应验证开始前检查准确目标文件；报告在确定时间戳后检查准确目标文件。发生冲突时不会覆盖已有内容，Patch 和报告也不会写入 tracked 目标文件。

Worktree 中不 commit、不创建分支、不 stash、不 reset。默认模式不会执行 `git apply`，也不会把修改复制回主工作区。

漏洞分析和规划可以读取使用者保证干净的相关代码。只有适合自动修复的 Finding 才会从 `task_start_head` 创建 Worktree；修改和验证只在该 Worktree 中完成。Worktree 和 Patch 基于 `task_start_head`，不包含主工作区的未提交修改。

明确启用应用模式后，只处理不与其他 `PATCH_READY` 重叠的 Patch。相互重叠的 `PATCH_READY` 均保留为 `NOT_APPLIED`，由人工决定应用顺序。开始前必须确认主工作区仍为 `task_start_head`；检查失败时不会应用任何待应用 Patch。

前置检查通过后按 Finding 编号串行执行 `git apply --check --binary` 和 `git apply --binary`。单条失败会记录实际命令、退出码和错误摘要，然后继续下一条；不会使用 `--reject`、`--3way`，不会手工解决冲突，也不会回滚此前已经成功应用的 Patch。

## 并行与验证

只读分析、修复规划和不同 Worktree 中的代码修改可以并行。以下操作串行执行：

- Worktree 创建，避免竞争公共 Git 元数据；
- Patch 安全审查、Build、Test 和安全回归验证，避免多个 Finding 同时争用缓存、端口、数据库、容器或服务。

Worktree 只隔离源码目录和 Git index，不提供运行时隔离。验证命令运行在共享宿主环境中。需要更强隔离时，应在容器、虚拟机或独立 CI Job 中运行整个工具包。

不会执行 watch、dev server 或后台常驻命令。依赖共享可写数据库、固定端口、长期容器或其他持久资源，但无法确认安全边界时，相关验证记为 `NOT_RUN` 并交给人工检查。

## 命令来源

Build/Test 命令只来自：

1. 用户明确提供的完整命令；
2. 仓库 README、开发说明或 Agent 指令；
3. Maven、Gradle、package.json、Makefile、CI 等项目已有配置。

`task-preflight` 不猜测命令，`fix-validator` 只运行它已经确认的命令。工具包不安装缺失依赖，也不补造环境变量、数据库、服务或 Secret。每条实际命令都会记录来源、工作目录、退出码和关键输出。

## 修复与裁决

只有以下条件同时成立才会进入 code-fixer：

- 漏洞结论为 `VULNERABLE`；
- 置信度为 `HIGH`；
- 能匹配现有领域 Skill 中的明确 strategy；
- 规划结论为 `AUTO_FIX` 或 `AUTO_FIX_WITH_REVIEW`；
- 补丁前证据与当前 Finding 对应。

每条 Finding 的最终状态只能是：

- `PATCH_READY`
- `PATCH_REJECTED`
- `HUMAN_REVIEW`
- `FALSE_POSITIVE`
- `GUIDANCE_ONLY`
- `NOT_SUPPORTED`

`PATCH_READY` 要求 Patch 完整、范围正确，并且 Evidence Binding、Patch Scope、Security Fix、Build、Tests 和 Security Regression 全部通过。主工作区是否 dirty 不改变单 Patch 的独立裁决。

任何必要检查失败时为 `PATCH_REJECTED`。没有失败但存在 `NOT_RUN`、警告、证据不足或不确定时为 `HUMAN_REVIEW`。`AUTO_FIX_WITH_REVIEW` 永远不会被自动升级为 `PATCH_READY`。

`PATCH_READY` 只表示该 Patch 在自己的 Worktree 中相对于起始提交独立验证通过，不表示多个 Patch 可以安全组合。应用结果另外记录为 `APPLIED`、`APPLY_FAILED` 或 `NOT_APPLIED`，不会改变 Patch 的独立裁决状态。

## 多 Patch 风险

每个 Patch 始终只处理一个 Finding。主编排会比较各 Patch 的计划文件、实际文件和 Hunk，记录重叠风险，但不会合并 Patch，也不会在 Worktree 中做组合测试。

应用模式不会自动应用相互重叠的 `PATCH_READY`；这些 Patch 保持独立裁决状态，应用状态记录为 `NOT_APPLIED`，由人工决定顺序。其余 Patch 按 Finding 编号处理。即使全部成功，独立验证也不能证明组合代码兼容，仍应在最终代码上重新运行完整测试。

## 报告与保留内容

每次任务生成一份：

```text
security-autofix-results/security-autofix-result-YYYY-MM-DD-HH-mm-ss.md
```

报告包含全部 Finding、原始身份、分析与规划、Patch 路径和 SHA-256、实际验证命令、应用状态与错误、未执行项、重叠风险、剩余风险及人工检查项。

如果主工作区起始时为脏状态，报告会明确记录这一点以及“相关代码和配置由使用者保证干净”的运行前提。Patch 不会自动包含其他本地修改，应用时由每条 Patch 的 `git apply --check` 判断能否应用。

Worktree、Patch 和报告默认保留，工具包不自动删除或 prune，便于用户复核和自行清理。

## 安全边界

工具包不会执行安装、发布、部署、数据库迁移、远程写入、Secret 操作、Git 暂存或 Git 提交。无人值守 Build/Test 会执行目标仓库已有代码和脚本，因此只适用于可信仓库或已经由用户隔离的运行环境。

已有安全报告只作为输入和补丁前证据；“生成了 Patch”不代表漏洞已经消失。
