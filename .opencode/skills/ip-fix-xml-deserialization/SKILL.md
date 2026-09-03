---
name: ip-fix-xml-deserialization
description: "当 FixPlan 处理 XXE、XML 注入、不安全反序列化或 DDE/公式注入时使用。"
---

# XML, Deserialization & Spreadsheet Security Strategies

## Strategy: `xxe`

**安全不变量：** 不可信 XML 不能解析外部实体、外部 DTD 或访问任意外部资源。

- 针对实际 Parser（DocumentBuilderFactory、SAXParserFactory、XMLInputFactory、TransformerFactory、dom4j/jdom/XStream 等）使用官方安全配置。
- 优先 Secure Processing，并显式禁止外部 Entity/DTD/Schema 访问。
- 安全 Feature 不受支持时不能 Catch 后忽略并继续不安全运行。
- 验证正常 XML 可解析，外部实体被阻断。

## Strategy: `xml-injection`

**安全不变量：** 不可信内容只能成为 XML Text/Attribute Data，不能成为标签、实体声明或 Parser 指令。

- 使用 DOM/StAX/Serializer/框架 Marshalling API。
- 禁止字符串拼接请求参数构造 XML。
- 同时存在 XML Parsing 风险时还必须满足 XXE 安全不变量。

## Strategy: `unsafe-deserialization`

**安全不变量：** 不可信字节或文本不能实例化任意运行时类型、触发 Gadget 链或调用非预期构造逻辑。

- 优先 Schema 化格式和显式 DTO。
- 避免 Java Native Serialization、XMLDecoder、开放多态类型、任意 YAML Tag 等危险机制。
- 必须保留时使用库官方严格 Type Allowlist/ObjectInputFilter 等机制。
- 协议/数据格式变化通常至少 `AUTO_FIX_WITH_REVIEW`。

## Strategy: `dde-injection`

**安全不变量：** 作为普通文本导出的不可信数据不能被 Excel/Office 解释成公式、DDE 表达式或可执行链接。

- 在序列化/导出边界使用项目统一 Spreadsheet/CSV 安全处理器。
- 对意图为文本的字段处理公式控制字符开头内容。
- 业务明确生成的可信公式不能被误伤。
