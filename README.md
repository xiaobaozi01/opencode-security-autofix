# IP Security AutoFix

OpenCode 安全漏洞真实性分析、自动修复、独立验证与 Patch 裁决工具包。

## 工作流

```text
/ip-security-fix 或 /ip-security-fix-report
        ↓
ip-security-autofix
        ↓
ip-report-analyzer
        ↓
ip-task-preflight
        ↓
ip-vuln-analyzer
        ↓
ip-fix-planner
        ↓
ip-code-fixer
        ↓
ip-fix-validator
        ↓
ip-final-judge
        ↓
ip-result-reporter
```

流程结构保持原 Security AutoFix 设计：一个 Finding 一条证据链、一个独立 Worktree、一个独立 Patch；默认不应用 Patch。

详见 `MIGRATION-NOTES.md`。
