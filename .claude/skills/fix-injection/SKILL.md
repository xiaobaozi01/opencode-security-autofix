---
name: fix-injection
description: "当 FixPlan 处理 SQL、NoSQL、命令、模板、表达式、XPath、LDAP 或 JNDI 注入时使用。"
metadata:
  toolkit: security-autofix
  purpose: defensive-repair
  language: zh-CN
---

## 使用方式

FixPlan 会指定 `strategy`。只执行与该 `strategy` 对应的章节；如果代码事实与策略不匹配，停止修改并返回 `PLAN_INVALIDATED`。不要因为加载了本领域 Skill 就顺便修复其他漏洞。

## 通用原则

- 优先最小补丁和项目已有安全组件。
- 禁止通过 Suppress、忽略规则、黑名单式伪修复只消除扫描告警。
- 修改必须保持已知业务/API/数据兼容约束。
- 每个 strategy 的验证要求至少覆盖原危险路径。

## Strategy: `sql-injection` — SQL Injection

## 安全不变量
不可信数据绝不能成为 SQL 语法。普通值必须参数化；动态列名、排序方向、关键字等必须由有限 Allowlist 从外部 token 映射到可信常量。

## MyBatis 普通值
当 `${value}` 表示数据值而不是 SQL 语法时，改为 `#{value}`。

## ORDER BY / 列名 / 排序方向
Bind Parameter 通常不能表示 SQL Identifier。**禁止**机械把 `${orderBy}` 改成 `#{orderBy}`。
正确方式：
1. 在业务边界把用户输入映射到 Enum/Allowlist。
2. Mapper/XML 只接收可信枚举或固定片段。
3. 未知值根据现有 API 约定拒绝或使用安全默认值。

## JDBC
字符串拼接 SQL 改为 `PreparedStatement` 参数绑定，不要手动给 `?` 加引号。

## JPA/Hibernate
值使用命名/位置参数；动态属性和排序字段映射到已知 Entity Attribute，不拼接原始用户字符串。

## 禁止伪修复
- Regex 黑名单
- SQL 关键字黑名单
- 仅 Escape 用户输入
- Suppress 扫描规则
- 修复后丢失原有合法排序/过滤能力

## 验证
至少覆盖正常值和代表性的 SQL 元字符输入，并用安全回归测试直接验证原 Source -> Sink 不再允许不可信数据改变 SQL 结构。

## Strategy: `nosql-injection` — NoSQL Injection

## 安全不变量
不可信输入不能控制 MongoDB/Redis/Elasticsearch 等查询结构、操作符、脚本或动态表达式。

## 修复原则
- 使用框架/驱动的类型化 Query Builder。
- 外部值只作为值，不直接 Merge 到查询对象。
- 动态字段、排序、操作符使用有限 Allowlist。
- 禁止仅删除 `$` 等字符的黑名单式修复。

## Strategy: `command-injection` — 命令注入

## 安全不变量
不可信输入不能控制 Shell 语法、可执行程序选择或无约束命令参数。

## 推荐修复
- 能用 Java/Python/Node 原生库 API 完成的功能，不调用外部 Shell。
- 必须启动进程时使用参数数组形式，如 Java `ProcessBuilder(List<String>)`，固定 executable。
- 外部输入如果用于选择模式、子命令或选项，使用有限 Allowlist / Enum 映射。

## 禁止伪修复
- 仅做 Shell Escape。
- 使用 `sh -c`、`bash -c`、`cmd /c`、PowerShell 拼接命令字符串。
- 让用户输入进入 GroovyShell、ScriptEngine 等可执行表达式环境。

验证正常功能以及控制字符/元字符输入被安全拒绝。

## Strategy: `template-injection` — 模板注入（SSTI）

## 安全不变量
不可信输入只能作为 Template Data，不能成为 Template Source 或可执行模板表达式。

## 修复原则
- 使用固定可信模板文件/模板字符串。
- 外部数据通过模板 Context/Model 参数传入。
- 禁止运行时把用户输入拼成 FreeMarker、Velocity、Thymeleaf、Groovy、Pebble、Jinjava、Handlebars 等模板源码后执行。
- 如果业务确实支持用户模板，需要独立的 Sandbox/能力模型和人工安全设计，不自动猜策略。

## Strategy: `expression-injection` — 表达式注入

## 安全不变量
不可信字符串不能被 SpEL、OGNL、MVEL、JEXL、JUEL、Groovy、JavaScript 或其他表达式引擎执行。

## 修复原则
- 用类型化 API、Enum、固定 Predicate、Strategy Map 替代动态表达式。
- 外部输入只能选择预定义操作，不能成为表达式源码。
- 禁止依赖关键字黑名单“过滤危险表达式”。

## Strategy: `xpath-injection` — XPath 注入

## 安全不变量
不可信输入不能改变 XPath 查询结构。

## 修复原则
- 支持时使用 XPath Variable Resolver / 参数绑定。
- 动态 Element/Attribute/Query Choice 无法绑定时，使用有限 Allowlist 映射到固定 XPath 片段。
- 禁止直接字符串拼接用户值构造 XPath。
- 不把通用 XML Escape 当作完整 XPath Injection 防护。

## Strategy: `ldap-injection` — LDAP 注入

## 安全不变量
不可信输入只能作为 LDAP 查询值，不能改变 Filter 结构、属性名或逻辑操作符。

## 修复原则
- 优先使用框架参数化 Filter API。
- 必须拼接值时使用 LDAP 规范/框架提供的专用转义函数。
- 动态属性名、操作符或查询片段必须用有限 Allowlist 映射。
- 禁止使用通用 HTML/URL/SQL Escape 代替 LDAP Filter Escape。

## Strategy: `jndi-injection` — JNDI 注入

## 安全不变量
外部输入不能选择任意 JNDI Provider URL、协议或任意 Lookup Name。

## 修复原则
- 优先用 Dependency Injection / 配置化资源替代运行时动态 JNDI。
- 必须使用 JNDI 时，将外部 token 映射到固定可信名称。
- 禁止从请求参数构建 InitialContext Provider Environment。
