---
name: fix-auth-security
description: "修复 JWT、Cookie/Session、授权/IDOR/BOLA 与 Mass Assignment 等认证授权问题。"
compatibility: opencode
metadata:
  toolkit: security-autofix
  purpose: defensive-repair
  language: zh-CN
---

## 使用方式

Repair Catalog 会传入 `strategy`。只执行与该 `strategy` 对应的章节；不要因为加载了本领域 Skill 就顺便修复其他漏洞。

## 通用原则

- 优先最小补丁和项目已有安全组件。
- 禁止通过 Suppress、忽略规则、黑名单式伪修复只消除扫描告警。
- 修改必须保持已知业务/API/数据兼容约束。
- 每个 strategy 的验证要求至少覆盖原危险路径。

## Strategy: `jwt-security` — JWT 安全

## 安全不变量
任何作为身份/权限依据的 JWT 都必须经过可信密钥的签名验证，并验证应用要求的时间与发行方/受众等 Claim。

## 修复原则
- 使用 `verify` 而不是只 `decode`。
- 固定/Allowlist 允许的算法，禁止 `none` 或不受控算法协商。
- 校验 `exp`，并按系统约定检查 `nbf/iat/iss/aud`。
- Secret/Private Key 不硬编码。
- 不要让 Token Header 自行决定 Key/Algorithm 而缺少可信映射。

## Strategy: `cookie-security` — Cookie / Session 安全

## 安全不变量
身份认证/Session Cookie 在无需脚本访问时设置 `HttpOnly`；HTTPS 环境设置 `Secure`；`SameSite` 必须与合法跨站流程相匹配。

## 注意
- 不要机械设置 `SameSite=Strict`，OAuth/SSO/支付等跨站流程可能需要 `Lax` 或 `None`。
- `SameSite=None` 在现代浏览器中通常必须配合 `Secure`。
- 优先使用 Spring Boot / Spring Security / Web 框架统一配置，而不是手写 Header。

## Strategy: `authorization` — 授权 / IDOR / BOLA

## 默认分类
`HUMAN_REVIEW`。只有当仓库中已经存在**针对同类资源、语义明确且可直接复用**的授权策略/服务/注解时，才考虑 `AUTO_FIX_WITH_REVIEW`。

## 安全不变量
任何受保护资源或敏感操作，都必须在访问/修改前，根据当前已认证主体、角色/权限、租户和资源归属规则完成授权判断。

## 修复原则
- 优先复用项目已有授权服务、Spring Security Method Security、策略对象或统一鉴权组件。
- 不允许 AI 猜测 `ownerId`、`tenantId`、管理员角色或例外规则。
- 不要在 Controller 零散硬编码一套新权限模型。
- 如果无法确定“谁可以访问什么”，必须转 `HUMAN_REVIEW`。

## Strategy: `mass-assignment` — Mass Assignment

## 安全不变量
客户端只能修改业务明确允许修改的字段，不能通过额外 JSON/Form 字段改变角色、权限、租户、余额、Owner 等敏感属性。

## 推荐修复
- 不直接把持久化 Entity 作为写接口 RequestBody。
- 使用明确的 Create/Update Request DTO。
- 逐字段或通过受控 Mapper 映射允许更新字段。
- 敏感字段由服务端上下文决定，而不是接受客户端输入。
