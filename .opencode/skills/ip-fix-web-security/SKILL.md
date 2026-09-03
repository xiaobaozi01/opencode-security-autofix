---
name: ip-fix-web-security
description: "当 FixPlan 处理 XSS、开放重定向、CORS、CSRF 或 HTTP Header 安全问题时使用。"
---

# Web Security Strategies

## Strategy: `xss`

**安全不变量：** 除非业务明确提供经过严格 Sanitizer 的富文本能力，否则不可信内容只能作为数据，不能成为 HTML/JavaScript/URL/CSS 可执行语法。

- 使用框架默认 escaped rendering。
- 无需 HTML 时将 raw HTML Sink 改为文本 API。
- 富文本使用项目批准的 Sanitizer + 明确策略，并靠近 Trust Boundary 处理。
- 按实际 Context 选择编码方式。

## Strategy: `open-redirect`

**安全不变量：** 用户可控跳转参数不能重定向到任意攻击者站点。

- 优先只允许站内相对路径。
- 必须外域时，对解析后的 Scheme/Host/Port 做精确 Allowlist。
- 处理协议相对 URL、UserInfo、编码和大小写差异。

## Strategy: `cors-misconfiguration`

**安全不变量：** 跨域访问只来自明确可信 Origin，并只开放业务需要的方法、Header 和 Credential 行为。

- 使用配置化 Origin Allowlist。
- Credential 场景禁止无约束 Origin。
- 无法从项目配置确定生产可信域名时必须人工确认。

## Strategy: `csrf`

**安全不变量：** 依赖 Cookie/Session 等浏览器自动携带凭据的状态变更请求不能被第三方站点伪造。

- Session/Cookie 鉴权优先框架 CSRF 防护并确保前端发送 Token。
- Authorization Header 等非 Ambient Credential API 先判断 CSRF 是否适用。
- OAuth/SSO 同时关注 `state` 等防伪机制。

## Strategy: `security-headers`

**安全不变量：** 浏览器安全策略与真实部署边界一致，降低 XSS、Clickjacking、MIME Sniffing 与降级风险。

重点检查 CSP/`frame-ancestors`、HSTS、`X-Content-Type-Options`、`Referrer-Policy`，必要时 `Permissions-Policy`。不机械生成过严 CSP；HSTS 必须确认 HTTPS 边界。

## Strategy: `crlf-injection`

**安全不变量：** 不可信数据不能注入额外 HTTP Header 行或造成响应拆分。

- 使用结构化 Header API。
- Content-Disposition 优先安全 Builder/Encoder。
- 对外部派生 Header 值拒绝 CR/LF 控制字符。

## Strategy: `host-header-injection`

**安全不变量：** 不可信 Host/Forwarded Header 不能影响密码重置链接、回调地址、安全敏感绝对 URL 或信任决策。

- 安全链接优先配置 canonical public base URL。
- 反向代理 Header 使用框架可信代理机制并限定边界。
