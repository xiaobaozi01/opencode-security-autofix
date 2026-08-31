---
description: "只读验证已有安全 Patch，不主动修改或应用代码"
agent: security-autofix
---

以 `VERIFY` 模式验证以下安全 Patch：

$ARGUMENTS

默认只读验证。要求明确的 Patch 或 Diff，以及补丁前代码、历史 Diff、Scanner 报告、人工漏洞描述或其他可核查的补丁前证据；完全缺少补丁前证据时转为 `HUMAN_REVIEW`。

执行 Security Review、Patch Scope、Build、Test、安全回归验证和 Regression Review。只有安全回归覆盖为 `COVERED` 且其他必要 Gate 全部通过，才可能把所验证的 Patch 标记为 `PATCH_READY`。不得运行 Scanner，也不得声称 Patch 已应用或目标项目已经修复。

如果输入包含多个 Patch，必须逐个独立验证，并报告 `overlaps_with` 和组合风险；不得为了验证组合效果而把它们应用到主工作区。最后生成一份 Markdown 总报告。
