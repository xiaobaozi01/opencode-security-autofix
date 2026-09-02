---
name: security-fix-report
description: "读取安全扫描报告，为每个适合修复的 Finding 生成独立 Patch；可按明确要求尝试应用。"
argument-hint: "<扫描报告路径>"
disable-model-invocation: true
allowed-tools:
  - Agent(report-analyzer)
  - Agent(task-preflight)
  - Agent(vuln-analyzer)
  - Agent(fix-planner)
  - Agent(code-fixer)
  - Agent(fix-validator)
  - Agent(final-judge)
  - Agent(result-reporter)
  - Read
  - Glob
  - Grep
  - Bash(git status *)
  - Bash(git rev-parse *)
  - Bash(git worktree *)
  - Bash(git apply *)
  - PowerShell(git status *)
  - PowerShell(git rev-parse *)
  - PowerShell(git worktree *)
  - PowerShell(git apply *)
---

@${CLAUDE_PROJECT_DIR}/.claude/agents/security-autofix.md

读取并处理以下安全扫描报告：

$ARGUMENTS

主工作区可以为脏状态，但使用者必须保证相关代码、测试和配置与 `HEAD` 一致。

保留报告中的 Finding 身份和原始证据，执行上面的 Security AutoFix 流程。默认只生成 Patch；仅当用户在参数中直接要求时才尝试应用。返回任务摘要和总报告路径。
