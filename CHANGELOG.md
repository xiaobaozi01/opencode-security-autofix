# CHANGELOG

## 可靠性修复版本

- 修正 Node 项目缺少 Test Script 时错误执行 `test` 的问题，并支持传递针对性测试选择器。
- Gradle `compile` 改为执行 `classes`，不再等同于完整 `build`。
- `autofix_build` 新增 Python、Go、.NET 支持和显式 `ecosystem` 选择。
- Scanner 成功退出但未生成报告时返回 `FAIL`，并增加明确的超时状态原因。
- CSV/TSV Adapter 支持引号字段内换行、转义引号、BOM 和缺失单元格。
- Repair Catalog 增加常见语言与框架别名归一化。
- 同一秒生成的结果报告使用递增后缀，避免覆盖已有文件。
- 新增 19 个自动化测试，覆盖 Build、Scanner、Catalog、Report Adapter 和结果文件行为。

## Plugin 化版本

- 删除项目根目录 `security-autofix/` 运行时目录。
- 删除 `.opencode/tools/autofix_*.ts` 独立 Tool 文件。
- 新增 `.opencode/plugins/security-autofix.ts` Local Plugin，由 Plugin 统一注册 5 个 AutoFix Tool。
- Adapter、Repair Catalog、Contract 和 Tool 实现迁移到 `.opencode/lib/security-autofix/`。
- 项目配置统一为 `.opencode/security-autofix.json`。
- Repair Catalog 从外部 JSON 改为 Plugin 内部类型化 Catalog，并新增 `autofix_repair` 路由 Tool。
- Report Adapter、Scanner Adapter、Repair Entry 均支持通过独立 OpenCode Plugin 注册扩展，无需修改核心 Registry。
- Scanner 临时报告迁移到 `.opencode/.cache/security-autofix/scans/`。
- 保留 8 个 Agent、8 个领域 Repair Skill、36 条内置 Repair 路由及全部验证 Gate。
- 最终 Markdown 文件名继续强制包含本地年月日时分秒。
