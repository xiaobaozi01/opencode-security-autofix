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
│   └── security-fix-report.md
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
分配 finding_key，建立 finding_registry
    ↓
fix-validator (task_preflight → baseline_by_finding)
    ↓
vuln-analyzer → fix-planner
    ↓
按 finding_key 串行创建 Worktree
    ↓
code-fixer 可在不同 Worktree 并行修改
    ↓ 等待全部 code-fixer 完成
串行 validation_queue
├── 1. finding-001 → validate_patch → finding-001.patch
├── 2. finding-002 → validate_patch → finding-002.patch
└── 3. finding-003 → validate_patch → finding-003.patch
    ↓
final-judge（逐 Patch）→ result-reporter（一次总报告）

主工作区：不编辑、不应用 Patch、不运行候选 Build/Test
```

每个 Finding 都有独立 Worktree、独立 Diff、独立验证证据和独立 Patch Artifact。只读分析、规划和不同 Worktree 中的代码修改可以并行；Worktree 创建以及 Security Review、Build、Test 和安全回归验证严格串行。

Worktree 只隔离源码目录和各自的 Git index，不隔离 Maven/Gradle/npm 缓存、进程、端口、数据库、容器或外部服务。工具包将验证模式如实记录为 `SERIAL_SHARED_RUNTIME`，运行时隔离记录为 `NOT_PROVIDED`。

每条 Finding 还维护独立的状态和补丁前证据。单条 Finding 在分析、规划、Worktree、修复或验证阶段失败时，只停止该 Finding；仓库不是 Git 仓库、主工作区不干净、结果目录未被忽略或无法确定统一起始提交等仓库级 preflight 失败时，才停止全部 Finding。

## 使用

将 `.opencode/` 合并到目标项目，并在目标项目的 `.gitignore` 中加入：

```text
security-autofix-results/
```

然后使用：

```text
/security-fix <漏洞描述、Finding 或文件位置>
/security-fix-report <扫描报告路径>
```

也可以直接选择 `security-autofix` Agent 并提供同类输入。

## 输入

支持：

- 用户描述的安全问题；
- SARIF、JSON、CSV、Markdown 或文本扫描报告；
- Scanner Finding、CWE、Rule ID、文件和行号；

报告过大、内容截断或格式无法可靠理解时，工作流会明确标记警告，并停止为相关 Finding 自动生成 Patch。

## Patch-only 模型

目标目录必须是 Git 仓库、主工作区完全干净，并且结果目录已被 Git 忽略。验证器记录统一的 `task_start_head`，之后：

1. 为每个 Finding 分配任务内标识 `finding-001`、`finding-002` 等。外部 Finding ID 和用户输入不会直接进入路径。
2. 建立不可变 `finding_registry`，并由 preflight 生成按 `finding_key` 索引的 `baseline_by_finding`；后续 Agent 只能使用当前 key 的证据。
3. 按 `finding_key` 顺序从同一个 `task_start_head` 创建独立 detached worktree，避免并发修改公共 Git 元数据。
4. `code-fixer` 只修改对应 Worktree 中计划内的源码和安全回归测试；不同 Worktree 的 code-fixer 可以并行。
5. 等待全部 code-fixer 结束，将成功准备修改的 Finding 按 key 组成固定 `validation_queue`。
6. `fix-validator` 按队列严格串行运行；前一个完整返回后才能开始下一个。单项验证失败不阻止后续 Finding。
7. 每个 Finding 导出到：

```text
security-autofix-results/patches/<run-id>/<finding-key>.patch
```

8. 工具包不执行 `git apply`，也不把任何 Worktree 修改复制回主工作区。

唯一允许写入主工作区目录的内容是已忽略的结果目录，其中包含 Worktree、Patch Artifact 和最终报告。

## 命令发现和 Worktree 验证

Build 和 Test 命令只能来自：

1. 用户明确提供；
2. 仓库 README、开发说明或 Agent 指令；
3. `package.json`、`pom.xml`、Gradle、Makefile、CI 等项目已有配置。

验证器把每条命令的工作目录明确设置为对应 Worktree，并记录命令来源、工作目录、退出码和输出摘要。Security Review、Build、Test、安全回归测试和 Regression Review 全部在该 Worktree 中完成，候选命令不会在主工作区运行。

同一任务内一次只运行一个 `fix-validator`。每条验证记录 `validation_order`、`validation_execution=SERIAL_SHARED_RUNTIME`、`runtime_isolation=NOT_PROVIDED` 和 `concurrent_validation=false`。串行执行避免不同 Finding 同时争用共享缓存、端口和服务，但不等于运行时隔离。

缺少依赖、环境变量、服务、数据库或 Secret 时，不自动安装或补造环境；相关 Gate 使用 `NOT_RUN`。工具包不会执行发布、部署、数据库迁移、远程写入或 Secret 操作。

watch、dev server、后台常驻以及其他不会自行结束的命令不会执行。候选命令依赖共享可写数据库、固定端口、长期运行容器或其他持久服务，却无法确认资源由当前任务独占或可安全丢弃时，相关 Gate 使用 `NOT_RUN` 并转为 `HUMAN_REVIEW`。

## 无人值守权限

Front matter 使用显式允许和拒绝规则，不触发权限确认：

- 主 Agent 可以自动创建隔离 Worktree，但不能删除 Worktree、应用 Patch、commit、push、reset 或 stash；
- `fix-validator` 可以在指定 Worktree 中自动执行来源明确的 Build/Test 命令和导出 Patch；
- 命令不明确、缺少依赖或环境不完整时直接记录 `NOT_RUN` 并转为 `HUMAN_REVIEW`，不会暂停询问；
- 安装、部署、发布、迁移、远程写入和 Secret 操作始终禁止；
- 不需要也不应启用 OpenCode `--auto` 扩大其他权限。

Build/Test 会执行目标仓库中的代码或脚本。无人值守运行只适用于可信仓库或已经隔离的执行环境。

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

内部状态具有明确转换：`WORKTREE_PATCH_PREPARED` 才进入验证；`PLAN_INVALIDATED` 转为 `HUMAN_REVIEW`；`NO_CHANGE` 因没有可交付 Patch 转为 `PATCH_REJECTED`。单条 Worktree 创建失败、Subagent 超时、非法 JSON、key/head 不一致或证据无法归属时转为 `HUMAN_REVIEW`，并继续处理其他独立 Finding。提前停止的 Finding 仍会进入总报告。

## 补丁前证据与安全回归

Scanner 报告仅作为输入和补丁前 baseline。

preflight 为每个 `finding_key` 保存独立 baseline 条目，包括不可变原始身份、baseline 类型、状态、报告引用和证据。Scanner baseline 无法确认只会阻止对应 Finding，不会把其他 Finding 的报告证据拿来代替。

没有 Scanner 时，preflight 把该 Finding 的原始 baseline 条目标记为 `MANUAL_CODE_EVIDENCE/PENDING` 且不再改写；随后只有同一 `finding_key` 的 `vuln-analyzer` 对 `task_start_head` 代码给出的 `VULNERABLE/HIGH` 和具体 `file:line` 证据，才能在 validator 输出的 `baseline_evidence` 中形成 `CONFIRMED` 证据。它只能证明修改前代码存在漏洞，不能伪装成 Scanner 报告。

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

工具包不执行 Worktree 删除或 prune。所有 Worktree、Patch Artifact 和报告默认保留，便于复核，也避免无人值守运行中的强制删除风险。用户可以在工具包结束后自行清理；主工作区不会应用候选修改。

## 修复报告

每次任务生成一份：

```text
security-autofix-results/security-autofix-result-YYYY-MM-DD-HH-mm-ss.md
```

报告包含全部 Finding、`finding_key`、根因、策略、Patch 路径和 SHA-256、变更文件、Worktree 验证命令和证据、串行验证顺序、运行时隔离声明、未执行项、`overlaps_with`、组合风险、剩余风险及人工检查项。只有状态证据一致时才会声明观察到主工作区未变化。
