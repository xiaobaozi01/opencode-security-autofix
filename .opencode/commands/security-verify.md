---
description: "验证已经存在的安全补丁，不主动产生新的修改"
agent: security-autofix
---

验证以下已存在的安全修复：

$ARGUMENTS

默认只验证，不生成新补丁；除非用户明确要求继续修复。

必须由用户提供或明确指向**补丁应用前生成的历史扫描报告**作为 baseline；当前工作区上的第一次扫描只能算 rescan，禁止同时充当 baseline。缺少独立历史 baseline 时，确定性比较必须为 `INDETERMINATE`，最终结论不得为 `FIX_ACCEPTED`。

最终结果使用 `task.mode=VERIFY` 和 `patch_batch.status=EXISTING`，并保留 `verification_baseline`（历史报告路径/引用），不得伪造 AutoFix Patch Batch Receipt。

至少执行：fix-validator 统一执行的 Security Review、Build、Test、历史 baseline 与当前安全重扫的确定性比较、Regression Review，以及 final-judge 最终裁决。VERIFY 不执行 AUTOFIX 的补丁前复现流程。任何无法执行的验证必须标记 `NOT_RUN`，`INDETERMINATE` 或 `NOT_RUN` 都不能视作 `PASS`。

流程结束后必须调用 `result-reporter`，在 `security-autofix-results/` 下生成本次任务唯一的一份 Markdown 总报告，并向用户返回报告路径。
