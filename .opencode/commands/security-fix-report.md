---
description: "读取安全扫描报告并处理其中适合修复的 Finding"
agent: security-autofix
---

以 `AUTOFIX` 模式处理以下安全扫描报告：

$ARGUMENTS

要求完整读取可访问的报告，保留 Scanner、Rule、Finding ID、Fingerprint、位置和原始引用。按根因、Sink 和位置去重；逐条分析并串行处理。只有高置信度确认且存在明确领域 strategy 的 Finding 才允许修改。

每条补丁必须经过工作区范围检查、Security Review、Build、Test、安全重扫和 Regression Review。最后生成一份包含全部 Finding 的 Markdown 总报告。
