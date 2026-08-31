---
description: "分析安全问题，并为每个 Finding 生成一个独立验证的 Patch"
agent: security-autofix
---

处理以下安全问题：

$ARGUMENTS

先标准化输入，为每个 Finding 分配固定 `finding_key` 并按 key 建立补丁前证据账本，再确认漏洞真实性、选择领域 Skill、制定最小 Patch 计划。无论一个还是多个 Finding，每个允许修复的 Finding 都必须从同一个 `task_start_head` 创建独立 detached worktree，并导出一个独立 Patch。只读分析、规划和不同 Worktree 的 code-fixer 可以并行；Worktree 按 key 顺序创建，全部 code-fixer 完成后，Security Review、Build、Test 和安全回归测试按 key 严格串行执行。

不得修改主工作区源码、测试、配置或 Git index，不得执行 `git apply`。不同 Patch 即使修改相同文件或符号也不自动合并；必须在报告中记录 `overlaps_with` 和组合风险。

Scanner 报告仅作为输入和补丁前证据。`PATCH_READY` 只表示该 Patch 在自己的 Worktree 中相对于起始提交独立验证通过，不表示已经应用或与其他 Patch 兼容。

流程结束后生成一份 Markdown 总报告并返回所有 Patch 和保留的 Worktree 路径。不得清理 Worktree，也不得执行 commit、push、发布、部署、迁移或 Secret 操作。
