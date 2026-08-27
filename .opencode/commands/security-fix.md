---
description: "分析并自动修复一条或多条安全漏洞"
agent: security-autofix
---

针对当前用户有权修改的项目执行 Security AutoFix 防御性修复流程。

输入：

$ARGUMENTS

如果输入包含漏洞描述、文件路径、CWE、扫描器 Finding 等信息，先标准化，再完成漏洞确认、修复前基线、隔离 Patch Batch、构建/测试、安全审查、确定性重扫比较和最终裁决。`NOT_VULNERABLE | PARTIAL | NEED_CONTEXT` 禁止自动修改；只有全部必要 Gate 通过且重扫为 `ABSENT` 才能接受补丁，其他已应用 Batch 必须回滚。

流程结束后必须调用 `result-reporter`，在 `security-autofix-results/` 下生成本次任务唯一的一份 Markdown 总报告，并向用户返回报告路径。
