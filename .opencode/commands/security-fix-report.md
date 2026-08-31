---
description: "读取安全扫描报告并处理其中适合修复的 Finding"
agent: security-autofix
---

以 `AUTOFIX` 模式处理以下安全扫描报告：

$ARGUMENTS

要求完整读取可访问的报告，保留 Scanner、Rule、Finding ID、Fingerprint、位置和原始引用。按根因、Sink 和位置去重；逐条分析并按交互边界聚类。只有高置信度确认且存在明确领域 strategy 的 Finding 才允许修改。

多 Finding 修改使用 `PARALLEL_WORKTREE`：先分析全部 Finding 并按重叠文件、符号、组件、Source/Sink、安全组件和根因聚类。不同 Cluster 使用独立 detached worktree 并可并行修改，同一 Cluster 必须串行。每个 Worktree 只生成候选 Patch；主工作区按顺序重新分析、执行 `git apply --check` 并经批准应用，禁止 commit、分支、stash、`git apply --3way` 和强制合并。

全部 Patch 处理完后，在主工作区统一执行 Patch Scope、Security Review、Build、Test、安全回归测试和 Regression Review。本流程不执行 Rescan，不得声称 Scanner Finding 已确认消失。完成后再裁决全部 Finding，并生成一份包含候选、集成和最终证据的 Markdown 总报告。
