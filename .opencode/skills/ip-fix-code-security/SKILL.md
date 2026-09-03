---
name: ip-fix-code-security
description: "当 FixPlan 处理不安全反射或 ReDoS 等代码级安全问题时使用。"
---

# Code-Level Security Strategies

## 使用契约

只执行 `ip-fix-planner` 明确选择的 strategy；不顺便重构相邻代码。若实际代码与计划或安全不变量冲突，返回 `PLAN_INVALIDATED`。

## Strategy: `unsafe-reflection`

**安全不变量：** 不可信输入不能选择任意 Class、Method、Constructor 或调用内部/私有行为。

- 优先接口 + Strategy Map / Enum Dispatch。
- 必须反射时，将外部 token 映射到代码中固定的 Class/Method 引用。
- 验证预期父类型、接口、签名和可见性。
- 禁止 `Class.forName(userInput)`、`getMethod(userInput)` 直接使用用户输入。

## Strategy: `redos`

**安全不变量：** 攻击者可控输入不能触发灾难性回溯或构造无界正则执行。

- 消除嵌套量词、歧义重复和危险 `.*` 组合。
- 用户输入作为字面量时必须 quote，而不是作为正则源码。
- 必要时增加合理输入长度边界。
- 更适合解析器/字符串 API 的场景不要强行使用复杂 Regex。
- 用正常样例和长输入验证语义与性能边界。
