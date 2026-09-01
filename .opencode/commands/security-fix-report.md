---
description: "读取安全扫描报告，并为每个适合修复的 Finding 生成独立 Patch"
agent: security-autofix
---

读取并处理以下安全扫描报告：

$ARGUMENTS

运行前提：Git 工作区可以为脏状态，但使用者必须保证目标代码、测试以及影响构建和安全行为的配置都与 `HEAD` 一致。

保留报告工具名称（如有）、Finding 身份和原始证据，按照 Security AutoFix 的完整流程逐条分析。为适合修复的 Finding 生成独立 Patch，不修改主工作区，不合并 Patch。结束后返回全部 Finding、验证证据、组合风险和总报告路径。
