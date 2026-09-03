---
name: ip-fix-injection
description: "当 FixPlan 处理 SQL、NoSQL、命令、模板、表达式、XPath、LDAP 或 JNDI 注入时使用。"
---

# Injection Security Strategies

## 使用契约

只执行 `ip-fix-planner` 指定的 strategy。所有 strategy 的共同目标是：**不可信数据只能作为数据，不能改变可执行语法、查询结构或运行时目标选择。**

## Strategy: `sql-injection`

**安全不变量：** 不可信数据绝不能成为 SQL 语法。普通值参数化；动态列名、排序方向、关键字等由有限 Allowlist 映射到可信常量。

- MyBatis 普通值 `${value}` 改为 `#{value}`；但 ORDER BY/列名不能机械改成 bind parameter。
- 动态 Identifier 使用 Enum/Allowlist，在业务边界把外部 token 映射到固定片段。
- JDBC 使用 `PreparedStatement`；JPA/Hibernate 使用命名/位置参数。
- 禁止 Regex/关键字黑名单、仅 Escape、Suppress 告警等伪修复。
- 验证正常值和代表性 SQL 元字符输入，直接覆盖原 Source→Sink。

## Strategy: `nosql-injection`

**安全不变量：** 不可信输入不能控制 MongoDB/Redis/Elasticsearch 等查询结构、操作符、脚本或动态表达式。

- 使用类型化 Query Builder。
- 外部值只作为值，不直接 Merge 到查询对象。
- 动态字段、排序、操作符使用有限 Allowlist。

## Strategy: `command-injection`

**安全不变量：** 不可信输入不能控制 Shell 语法、可执行程序选择或无约束命令参数。

- 能用语言原生 API 就不调用 Shell。
- 必须启动进程时使用参数数组，固定 executable。
- 外部输入选择模式/子命令/选项时使用 Allowlist/Enum。
- 禁止 `sh -c`、`bash -c`、`cmd /c`、PowerShell 拼接和仅做 Shell Escape。

## Strategy: `template-injection`

**安全不变量：** 不可信输入只能作为 Template Data，不能成为 Template Source 或可执行模板表达式。

- 使用固定可信模板。
- 外部数据通过 Context/Model 参数传入。
- 用户可编辑模板属于独立 Sandbox/能力模型问题，不能自动猜策略。

## Strategy: `expression-injection`

**安全不变量：** 不可信字符串不能被 SpEL、OGNL、MVEL、JEXL、JUEL、Groovy、JavaScript 等表达式引擎执行。

- 用类型化 API、Enum、固定 Predicate 或 Strategy Map 替代动态表达式。
- 禁止依赖关键字黑名单过滤“危险表达式”。

## Strategy: `xpath-injection`

**安全不变量：** 不可信输入不能改变 XPath 查询结构。

- 支持时用变量绑定；动态 Element/Attribute/Query Choice 用 Allowlist 映射固定 XPath 片段。
- 不把通用 XML Escape 当作完整 XPath Injection 防护。

## Strategy: `ldap-injection`

**安全不变量：** 不可信输入只能作为 LDAP 查询值，不能改变 Filter 结构、属性名或逻辑操作符。

- 优先参数化 Filter API。
- 必须拼接值时使用 LDAP 专用转义。
- 动态属性名/操作符/查询片段用 Allowlist。

## Strategy: `jndi-injection`

**安全不变量：** 外部输入不能选择任意 JNDI Provider URL、协议或 Lookup Name。

- 优先 Dependency Injection/配置化资源。
- 必须 JNDI 时，把外部 token 映射到固定可信名称。
- 禁止从请求参数构建 InitialContext Provider Environment。
