---
name: security-fix
description: "分析安全问题，为每个 Finding 生成独立验证的 Patch；可按明确要求尝试应用。"
argument-hint: "<漏洞描述、Finding 或文件位置>"
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

处理以下安全问题：

$ARGUMENTS

主工作区可以为脏状态，但使用者必须保证相关代码、测试和配置与 `HEAD` 一致。

执行上面的 Security AutoFix 流程。默认只生成 Patch；仅当用户在参数中直接要求时才尝试应用。返回任务摘要和总报告路径。
