---
description: "分析并修复一条或多条安全问题"
agent: security-autofix
---

以 `AUTOFIX` 模式处理以下安全问题：

$ARGUMENTS

先标准化输入并确认漏洞真实性，再选择领域 Skill、制定最小补丁、执行修改前检查、串行修改、构建/测试/安全重扫和最终裁决。证据不足、工作区范围不清或验证无法完成时停止自动修改并转为人工审核。

流程结束后生成一份 Markdown 总报告并返回路径。不得执行 commit、push、发布、部署、迁移或 Secret 操作。
