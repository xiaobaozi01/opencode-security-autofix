---
description: "验证当前已有的安全补丁，不主动修改代码"
agent: security-autofix
---

以 `VERIFY` 模式验证以下安全补丁：

$ARGUMENTS

默认只读验证。必须区分补丁前历史 baseline 与当前工作区 rescan；当前扫描不能同时作为 baseline。缺少可信历史 baseline 或稳定 Fingerprint 时，Rescan 必须为 `INDETERMINATE`，不得输出 `FIX_ACCEPTED`。

执行 Security Review、Patch Scope、Build、Test、安全重扫比较和 Regression Review，最后生成一份 Markdown 总报告。除非用户明确追加修复请求，否则不得修改文件。
