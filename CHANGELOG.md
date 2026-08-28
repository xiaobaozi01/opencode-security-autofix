# CHANGELOG

## 闭环一致性与恢复修复

- Patch Batch 支持列举/查询和 `OPEN` 中断回滚，Manifest 原子更新；Git 工作区快照会阻止并恢复计划外修改，零修改批次禁止接受。
- 最终结果只接受规范 verdict、analysis、confidence 和 Gate 枚举，移除 `fixability` 兼容回退；建议类结论不能携带已应用补丁。
- VERIFY 必须引用补丁前生成的独立历史 baseline，当前扫描禁止同时充当 baseline 与 rescan；`autofix_compare` 生成绑定 Finding、报告路径和内容哈希的 Comparison Receipt，接受结论必须通过校验。
- Repair Route 接入 `analysis_confidence` 和字段来源，Analyzer/User 推断不能冒充 Scanner Rule、Taxonomy 或原始 Alias。
- SARIF Adapter 保留全部 full/partial fingerprints，并按双方共有的具名版本项比较。
- Build/Scanner 限制输出缓冲、支持调用取消、捕获启动失败；Scanner 在启动前校验超时，报告名加入 UUID。
- Windows 环境变量覆盖按大小写不敏感规则匹配并保留继承键名；Finding 文件路径只在 Windows 下折叠大小写。
- 超时/取消会终止 Windows 整棵进程树或 POSIX 独立进程组，不再只终止直接启动器进程。
- 自动化测试扩展到 65 个。

## Windows 命令启动修复

- Build Task 和命令型 Scanner 共用跨平台命令启动层。
- Windows 按 Task 环境的 `PATH/PATHEXT` 解析 `mvn.cmd`、`npm.cmd`、`pnpm.cmd`、`gradlew.bat` 等入口，并通过 `cmd.exe` 安全转义参数。
- Windows 原生 `.exe/.com` 及 macOS/Linux 命令继续使用直接 argv 执行，不引入 `cross-spawn` 依赖。
- 自动化测试扩展到 49 个。

## 修复闭环硬门禁版本

- 将 `VULNERABLE | NOT_VULNERABLE | PARTIAL | NEED_CONTEXT` 接入确定性 Repair Route 门禁，误报和证据不足项不能进入自动修改。
- Taxonomy 路由仅信任 Scanner/Adapter 的精确或子集关系；Analyzer、Relevant 和 Superset Taxonomy 强制人工审核。
- 未确认语言/框架适用性时不再自动返回 `MATCHED`。
- 新增稳定 Finding Identity 和 `autofix_compare`，要求修复前基线复现；只有 Fingerprint 可证明重扫 `ABSENT`。
- 新增 `autofix_patch` Patch Batch 快照、封存、接受、回滚与并发冲突保护；Batch 绑定稳定 Finding Key，并以本地 Receipt 证明真实 Accept/Rollback，失败重试禁止叠加补丁。
- `autofix_result` 在写报告前确定性校验真实性、Route、必要 Gate、Rescan 和 Patch Batch 状态，拒绝矛盾的 `FIX_ACCEPTED`。
- 最终结果 Tool 统一返回 snake_case 字段；报告不再把 AMBIGUOUS 的第一个候选显示成已确定分类。
- 自动化测试扩展到 48 个。

## Build Task 精简版本

- 删除 Maven、Gradle、Node、Python Build Adapter 及全部专属 Options。
- 删除 `action + target/adapter + configuration` 请求和 Target/Configuration 多层合并。
- `autofix_build` 改为列举或执行 `.opencode/security-autofix.json` 中的命名 Task。
- Task 只要求 `kind + command`，`cwd`、`paths`、`description`、`env`、`timeoutMs` 均可选；空 `cwd` 默认项目根目录。
- 新增单一 `{args}` argv 插入点，运行参数不经过 Shell 拆分或拼接。
- Task ID 只能由项目配置定义；Agent 依次使用用户指定、`kind`、`paths` 和唯一候选进行选择。
- 不保留上一版 Build 协议兼容入口，自动化测试保持 32 个。

## Repair 路由收敛版本

- 删除独立 `autofix_classify` 和 `autofix_repair`，收敛为单一 `autofix_route` Tool。
- `report-analyzer` 只输出 Scanner 事实和可审计 `semantic_candidates`，不再决定分类或 Repair Entry。
- `fix-planner` 将 Finding 证据、语言和框架一次传入 Router，直接获取 Provider/strategy。
- 删除 `100/80/60/45` 人为评分，改为 Scanner Rule -> Taxonomy -> Alias 的明确优先级。
- Repair Entry 同步删除已无意义的 `priority` 字段；Report Adapter 的解析优先级不受影响。
- 仅有模型语义候选时仍强制 `HUMAN_REVIEW`，不输出可自动修复的 `repair_entry_id`。
- 不保留上一版 Classification/Repair Tool 兼容入口。
- 自动化测试扩展到 32 个。

## Finding 分类协议重构版本

- 参考 SARIF 的 Rule Identity 和 Taxonomy 建模，将扫描器事实、分类判断与 Repair 路由拆分。
- 新增 `autofix_classify`，依次使用 Scanner Rule、Taxonomy、原始别名和语义候选匹配 Repair Catalog。
- 新增 `MATCHED | AMBIGUOUS | UNCLASSIFIED | NOT_SUPPORTED | HUMAN_REVIEW` 分类状态；只有 `MATCHED` 会输出可自动路由的 `repair_entry_id`。
- Repair Entry 改为 `display_type + matchers`，支持 Scanner Rule、Taxonomy 和 Alias 扩展。
- `autofix_repair` 改为只接受 `repair_entry_id + language + framework`，不再由 Agent 自由填写漏洞类型。
- Report Adapter 统一输出结构化 `RawFinding`，SARIF Adapter 保留 Rule、CWE Taxonomy、Fingerprint 和位置。
- Targeted Scan 协议改为 `repairEntryId/ruleId/findingId`，并更新 Command Scanner 占位符。
- 直接删除旧 `type`、`{type}`、`{rule}` 协议，不提供旧版兼容层。
- 自动化测试扩展到 31 个。

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
