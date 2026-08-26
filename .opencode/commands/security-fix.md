---
description: "分析并自动修复一条或多条安全漏洞"
agent: security-autofix
---

针对当前用户有权修改的项目执行 Security AutoFix 防御性修复流程。

输入：

$ARGUMENTS

如果输入包含漏洞描述、文件路径、CWE、扫描器 Finding 等信息，先标准化，再完成漏洞确认、最小补丁、构建/测试、安全审查、重扫和最终裁决。禁止跳过验证门禁。

流程结束后必须调用 `result-reporter`，在 `security-autofix-results/` 下生成本次任务唯一的一份 Markdown 总报告，并向用户返回报告路径。
