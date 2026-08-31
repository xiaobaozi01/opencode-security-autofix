---
description: "分析安全问题，并为每个 Finding 生成一个独立验证的 Patch"
agent: security-autofix
---

处理以下安全问题：

$ARGUMENTS

先标准化输入并确认漏洞真实性，再选择领域 Skill、制定最小 Patch 计划。无论一个还是多个 Finding，每个允许修复的 Finding 都必须从同一个 `task_start_head` 创建独立 detached worktree，在其中修改、执行 Security Review、Build、Test 和安全回归测试，并导出一个独立 Patch。

不得修改主工作区源码、测试、配置或 Git index，不得执行 `git apply`。不同 Patch 即使修改相同文件或符号也不自动合并；必须在报告中记录 `overlaps_with` 和组合风险。

Scanner 报告仅作为输入和补丁前证据。`PATCH_READY` 只表示该 Patch 在自己的 Worktree 中相对于起始提交独立验证通过，不表示已经应用或与其他 Patch 兼容。

流程结束后先生成一份 Markdown 总报告并返回所有 Patch 路径。报告写入成功后，只对满足全部条件的 `PATCH_READY` Worktree 逐个请求用户批准精确删除；其他 Worktree 保留。不得执行 commit、push、发布、部署、迁移或 Secret 操作。
