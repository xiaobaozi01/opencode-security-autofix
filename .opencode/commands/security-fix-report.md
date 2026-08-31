---
description: "读取安全扫描报告，并为每个适合修复的 Finding 生成独立 Patch"
agent: security-autofix
---

处理以下安全扫描报告：

$ARGUMENTS

完整读取可访问的报告，保留 Scanner、Rule、Finding ID、Fingerprint、位置和原始引用。按根因、Sink 和位置识别重复项，但每个保留的 Finding 独立分析。只有高置信度确认且存在明确领域 strategy 的 Finding 才允许生成 Patch。

为每个 Finding 分配固定的安全 `finding_key`，按 key 建立不可混用的补丁前证据账本，再从同一个 `task_start_head` 按 key 顺序创建独立 detached worktree。不同 Worktree 的 code-fixer 可以并行；全部修改完成后，按 key 严格串行执行每个 Patch 的 Security Review、Build、Test 和安全回归测试，并导出 `security-autofix-results/patches/<run-id>/<finding-key>.patch`。Worktree 只隔离源码，不得宣称隔离缓存、进程、端口、数据库、容器或外部服务。

不得把任何 Patch 应用到主工作区。每个 Patch 只对应一个 Finding；根据计划和实际 Patch 标记相互重叠的文件、Hunk、符号、组件和安全不变量，组合兼容性一律视为未验证。

最后生成一份 Patch 索引、独立验证证据、组合风险和保留 Worktree 路径的 Markdown 总报告。不得清理 Worktree。
