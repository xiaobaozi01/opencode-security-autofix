---
name: fix-xml-deserialization
description: "当 FixPlan 处理 XXE、XML 注入、不安全反序列化或 DDE/公式注入时使用。"
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

## Strategy: `xxe` — XXE

## 安全不变量
不可信 XML 不能解析外部实体、外部 DTD 或访问任意外部资源。

## 修复原则
针对实际 Parser 加固：
- `DocumentBuilderFactory`
- `SAXParserFactory`
- `XMLInputFactory`
- `TransformerFactory`
- dom4j / jdom / XStream 等

优先启用 Secure Processing，并显式禁止外部 Entity/DTD/Schema 访问。

如果某安全 Feature 不受当前 Parser 支持，不能简单 Catch 后忽略导致继续以不安全配置运行。

验证正常 XML 仍可解析，同时外部实体解析被阻断。

## Strategy: `xml-injection` — XML Injection

## 安全不变量
不可信内容只能成为 XML Text/Attribute Data，不能成为标签、实体声明或 Parser 指令。

## 修复原则
- 使用 DOM/StAX/Serializer/框架 Marshalling API。
- 禁止通过字符串拼接请求参数构造 XML。
- 如果同时存在 XML Parsing，必须同时满足 `fix-xxe` 的安全不变量。

## Strategy: `unsafe-deserialization` — 不安全反序列化

## 安全不变量
不可信字节或文本不能实例化任意运行时类型、触发 Gadget 链或调用非预期构造逻辑。

## 推荐修复
- 优先使用 Schema 化格式和显式 DTO。
- 避免 Java Native Serialization、XMLDecoder、开放多态类型、任意 YAML Tag 等危险机制。
- 必须保留反序列化时，使用库官方支持的严格 Type Allowlist / ObjectInputFilter 等机制。

协议/数据格式改变通常具有兼容性风险，默认 `AUTO_FIX_WITH_REVIEW`。

## Strategy: `dde-injection` — DDE/公式注入

## 安全不变量
作为普通文本导出的不可信数据，不能被 Excel/Office 等软件解释成公式、DDE 表达式或可执行链接。

## 修复原则
- 在序列化/导出边界使用项目统一的 Spreadsheet/CSV 安全处理器。
- 对意图为文本的字段，处理以公式控制字符开头的内容。
- 业务明确生成的可信公式不要被误伤。
- 保持用户可见文本语义，避免在业务层到处散落转义逻辑。
