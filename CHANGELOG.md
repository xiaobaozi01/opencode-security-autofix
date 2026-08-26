# CHANGELOG

## 构建范围精简版本

- `autofix_build` 移除 Go 和 .NET 支持，保留 Maven、Gradle、Node 和 Python。
- Build 命令解析改为四个内置 Adapter，统一输出 `command`、`cwd`、`env` 和 `timeoutMs`。
- Build Tool 改为新的 `action + target/adapter` 请求模型，删除旧 `mode/ecosystem=auto/module/test` 入口和自动检测兼容逻辑。
- 新增命名 Build Target 和 Configuration，支持项目默认配置、环境配置和单次调用逐层覆盖。
- Maven、Gradle、Node、Python 分别提供结构化专属参数，不需要拼接 Shell 命令字符串。
- 将结果文件防覆盖写入逻辑合并到 `result.ts`，删除独立的 `result-file.ts`。
- Report Adapter 和 Scanner Adapter 的插件注册扩展机制保持不变。
- 自动化测试扩展到 25 个。

## 可靠性修复版本

- 修正 Node 项目缺少 Test Script 时错误执行 `test` 的问题，并支持传递针对性测试选择器。
- Gradle `compile` 改为执行 `classes`，不再等同于完整 `build`。
- `autofix_build` 新增 Python 支持和显式 `ecosystem` 选择。
- Scanner 成功退出但未生成报告时返回 `FAIL`，并增加明确的超时状态原因。
- CSV/TSV Adapter 支持引号字段内换行、转义引号、BOM 和缺失单元格。
- Repair Catalog 增加常见语言与框架别名归一化。
- 同一秒生成的结果报告使用递增后缀，避免覆盖已有文件。
- 新增 18 个自动化测试，覆盖 Build、Scanner、Catalog 和 Report Adapter 行为。

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
