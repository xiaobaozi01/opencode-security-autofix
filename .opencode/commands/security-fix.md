---
description: "分析安全问题，并为每个 Finding 生成独立验证的 Patch；可按明确要求尝试应用"
agent: security-autofix
---

处理以下安全问题：

$ARGUMENTS

主工作区可以为脏状态，但使用者必须保证相关代码、测试和配置与 `HEAD` 一致。

执行 Security AutoFix 流程。默认只生成 Patch；仅当用户在 `$ARGUMENTS` 中直接要求时才尝试应用。返回任务摘要和总报告路径。
