---
name: ip-fix-auth-security
description: "当 FixPlan 处理 JWT、Cookie/Session、授权/IDOR/BOLA 或 Mass Assignment 时使用。"
---

# Authentication & Authorization Security Strategies

## 使用契约

只执行 `ip-fix-planner` 明确选择的 strategy。代码事实与 strategy 不匹配、需要新增业务权限语义或必须修改计划外文件时，立即返回 `PLAN_INVALIDATED`，不要自行扩大修复。

通用要求：最小补丁、复用项目已有安全组件、保持已知兼容性，不用 Suppress 或黑名单只消除扫描告警；回归验证必须覆盖原危险路径。

## Strategy: `jwt-security`

**安全不变量：** 任何作为身份或权限依据的 JWT 都必须用可信密钥验证签名，并按应用要求验证时间、发行方、受众等 Claims。

- 使用 verify 而不是只 decode。
- 固定或 Allowlist 允许算法，禁止 `none` 和不受控算法协商。
- 校验 `exp`，并按系统约定检查 `nbf/iat/iss/aud`。
- Secret/Private Key 不硬编码。
- Token Header 不能在缺少可信映射时自行决定 Key/Algorithm。

## Strategy: `cookie-security`

**安全不变量：** 身份认证/Session Cookie 在无需脚本访问时设置 `HttpOnly`；HTTPS 边界设置 `Secure`；`SameSite` 与合法跨站流程一致。

- 不机械设置 `SameSite=Strict`；OAuth/SSO/支付可能需要 `Lax` 或 `None`。
- `SameSite=None` 通常必须配合 `Secure`。
- 优先使用 Spring Security/Web 框架统一配置。

## Strategy: `authorization`

默认倾向 `HUMAN_REVIEW`。只有仓库已存在针对同类资源、语义明确且可直接复用的授权策略/服务/注解时，才考虑自动生成 Patch。

**安全不变量：** 受保护资源或敏感操作在访问/修改前，必须根据当前认证主体、权限、租户和资源归属规则完成授权。

- 优先复用已有授权服务、Method Security、策略对象或统一鉴权组件。
- 不猜 `ownerId`、`tenantId`、管理员角色或例外规则。
- 不在 Controller 零散发明新权限模型。
- 无法确定“谁可以访问什么”时转 `HUMAN_REVIEW`。

## Strategy: `mass-assignment`

**安全不变量：** 客户端只能修改业务明确允许的字段，不能通过额外字段改变角色、权限、租户、余额、Owner 等敏感属性。

- 不直接把持久化 Entity 作为写接口 RequestBody。
- 使用明确 Create/Update Request DTO。
- 逐字段或通过受控 Mapper 映射允许更新字段。
- 敏感字段由服务端上下文决定，而不是接受客户端输入。
