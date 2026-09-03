# IP Security AutoFix — 命名与入口重构说明

## 本次改动

- 所有 OpenCode Agent ID 增加 `ip-` 前缀。
- 所有 OpenCode Command ID 增加 `ip-` 前缀。
- 所有领域 Skill ID 增加 `ip-` 前缀。
- Agent front matter 只保留 `description`、`mode`、`permission`。
- Agent 正文沿用上一版“证据驱动 + 根因优先 + 独立验证”的重构设计，并同步所有内部引用和权限白名单。
- Command 从简单转发模板重写为任务入口契约，强调任务边界、报告/仓库内容不可越权、阶段门槛和完成证据。

## ID 对照

| 原 ID | 新 ID |
| --- | --- |
| security-autofix | ip-security-autofix |
| report-analyzer | ip-report-analyzer |
| task-preflight | ip-task-preflight |
| vuln-analyzer | ip-vuln-analyzer |
| fix-planner | ip-fix-planner |
| code-fixer | ip-code-fixer |
| fix-validator | ip-fix-validator |
| final-judge | ip-final-judge |
| result-reporter | ip-result-reporter |
| security-fix | ip-security-fix |
| security-fix-report | ip-security-fix-report |
| fix-* | ip-fix-* |

## Front matter 约定

### Agent
严格只保留：

```yaml
---
description: ...
mode: primary | subagent
permission: ...
---
```

### Command
保留 `description` 和 `agent`。`agent` 用于确保命令进入 `ip-security-autofix` 主编排 Agent；删除后命令会在当前 Agent 上下文运行，不能保证原有流程结构。

### Skill
保留 `name` 和 `description`。Skill 的目录与 `name` 都使用 `ip-*`，保证发现与权限匹配稳定。

## 新命令

- `/ip-security-fix <漏洞描述、Finding 或文件位置>`
- `/ip-security-fix-report <扫描报告路径及可选约束>`

默认仅生成 Patch。只有用户在本次命令参数中直接明确要求时才尝试应用。
