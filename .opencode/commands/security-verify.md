---
description: "验证当前已有的安全补丁，不主动修改代码"
agent: security-autofix
---

以 `VERIFY` 模式验证以下安全补丁：

$ARGUMENTS

默认只读验证。要求补丁前代码、历史 Diff、Scanner 报告、人工漏洞描述或其他可核查的补丁前证据；Scanner 报告仅作为历史 baseline，不执行当前扫描比较。完全缺少补丁前证据时转为 `HUMAN_REVIEW`。

执行 Security Review、Patch Scope、Build、Test、安全回归验证和 Regression Review。只有安全回归覆盖为 `COVERED` 且其他必要 Gate 全部通过才可能接受；不得运行 Scanner，也不得声称 Scanner 已确认 Finding 消失。最后生成一份 Markdown 总报告。除非用户明确追加修复请求，否则不得修改文件。

如果补丁来自并行 Worktree，必须同时读取 Patch 账本和主工作区 `final_batch` 证据；Worktree 内候选验证不能单独支持 `FIX_ACCEPTED`。
