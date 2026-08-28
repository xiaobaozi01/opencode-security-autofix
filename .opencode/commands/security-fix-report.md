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
6. 每个 Patch Batch 修改前必须快照计划文件并确认基线 Finding 为 `PRESENT`，修改后独立完成统一 fix-validator 中的 Security Review、Build、Test、确定性 Rescan Compare 和 Regression Review。
7. 每个 Batch 必须通过 `autofix_patch(action=finalize)` 结束；只有接受前 Gate 与 Comparison Receipt 复核有效的 `FIX_ACCEPTED` 可以保留，其他结论或无效证据必须回滚。
8. 最终汇总接受、拒绝、人工审核、仅建议和不支持的漏洞。

流程结束后必须调用 `result-reporter`，在 `security-autofix-results/` 下生成本次任务唯一的一份 Markdown 总报告，并向用户返回报告路径。
