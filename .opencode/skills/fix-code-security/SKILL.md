---
name: fix-code-security
description: "当 FixPlan 处理不安全反射或 ReDoS 等代码级安全问题时使用。"
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

## Strategy: `unsafe-reflection` — 不安全反射

## 安全不变量
不可信输入不能选择任意 Class、Method、Constructor 或调用内部/私有行为。

## 修复原则
- 优先使用接口 + Strategy Map / Enum Dispatch。
- 必须反射时，外部 token 映射到代码中固定的 `Class` / `Method` 引用。
- 验证预期父类型、接口、签名和可见性。
- 禁止 `Class.forName(userInput)` 或 `getMethod(userInput)` 直接使用用户输入。

## Strategy: `redos` — ReDoS

## 安全不变量
攻击者可控输入不能触发指数级/灾难性正则回溯，或构造无界正则表达式执行。

## 修复原则
- 消除嵌套量词、歧义重复、危险 `.*` 组合等结构。
- 用户输入作为字面量时必须 quote，而不是作为正则源码。
- 必要时增加合理输入长度边界。
- 更适合解析器/字符串 API 的场景不要强行使用复杂 Regex。
- 通过正常样例与长输入测试保持语义。
