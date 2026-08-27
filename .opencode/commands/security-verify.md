---
description: "验证已经存在的安全补丁，不主动产生新的修改"
agent: security-autofix
---

验证以下已存在的安全修复：

$ARGUMENTS

默认只验证，不生成新补丁；除非用户明确要求继续修复。

最终结果使用 `task.mode=VERIFY` 和 `patch_batch.status=EXISTING`，不得伪造 AutoFix Patch Batch Receipt。

至少执行：fix-validator 统一执行的 Security Review、Build、Test、配置好的修复前基线与确定性安全重扫比较、Regression Review，以及 final-judge 最终裁决。任何无法执行的验证必须标记 `NOT_RUN`，`INDETERMINATE` 或 `NOT_RUN` 都不能视作 `PASS`。

流程结束后必须调用 `result-reporter`，在 `security-autofix-results/` 下生成本次任务唯一的一份 Markdown 总报告，并向用户返回报告路径。
