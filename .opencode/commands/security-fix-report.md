---
description: "读取安全扫描报告，并为每个适合修复的 Finding 生成独立 Patch"
agent: security-autofix
---

处理以下安全扫描报告：

$ARGUMENTS

完整读取可访问的报告，保留 Scanner、Rule、Finding ID、Fingerprint、位置和原始引用。按根因、Sink 和位置识别重复项，但每个保留的 Finding 独立分析。只有高置信度确认且存在明确领域 strategy 的 Finding 才允许生成 Patch。

为每个 Finding 分配安全的 `finding_key`，从同一个 `task_start_head` 创建独立 detached worktree。每个 Worktree 只能修改一条 Finding、执行该 Patch 的 Security Review、Build、Test 和安全回归测试，并导出 `security-autofix-results/patches/<run-id>/<finding-key>.patch`。

不得把任何 Patch 应用到主工作区。每个 Patch 只对应一个 Finding；根据计划和实际 Patch 标记相互重叠的文件、Hunk、符号、组件和安全不变量，组合兼容性一律视为未验证。

本流程不执行 Rescan，不得声称 Scanner Finding 已确认消失。最后生成一份 Patch 索引、独立验证证据和组合风险 Markdown 总报告。
