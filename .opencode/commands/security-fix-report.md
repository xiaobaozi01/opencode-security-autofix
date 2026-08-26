---
description: "读取安全扫描报告并批量修复其中适合自动修复的漏洞"
agent: security-autofix
---

针对当前用户有权修改的项目执行 Security AutoFix 扫描报告修复流程。

报告输入：

$ARGUMENTS

要求：
1. 先解析并标准化整份报告，保留原始报告引用和 Finding ID。
2. 基于根因和 Sink 去重，不允许只按 CWE 去重。
3. 对每条漏洞判断可修复性。
4. 只自动修复 `AUTO_FIX` 和 `AUTO_FIX_WITH_REVIEW`。
5. 修改同一文件/方法的 Patch 必须串行。
6. 每个 Patch Batch 都必须独立完成 统一 fix-validator 中的 Security Review、Build、Test、Rescan 和 Regression Review。
7. 最终汇总接受、拒绝、人工审核、仅建议和不支持的漏洞。

流程结束后必须调用 `result-reporter`，在 `security-autofix-results/` 下生成本次任务唯一的一份 Markdown 总报告，并向用户返回报告路径。
