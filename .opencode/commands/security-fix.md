---
description: "分析安全问题，并为每个 Finding 生成一个独立验证的 Patch"
agent: security-autofix
---

处理以下安全问题：

$ARGUMENTS

运行前提：Git 工作区可以为脏状态，但使用者必须保证目标代码、测试以及影响构建和安全行为的配置都与 `HEAD` 一致。

按照 Security AutoFix 的完整流程分析真实性、选择现有 Skill strategy，并为适合修复的 Finding 生成独立 Patch。不要修改主工作区，也不要应用或提交 Patch。结束后返回每条 Finding 的结论、Patch、验证证据和总报告路径。
