---
name: fix-web-security
description: "修复 XSS、开放重定向、CORS、CSRF、安全响应头、CRLF/Header 与 Host Header 等 Web 安全问题。"
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

## Strategy: `xss` — XSS

## 安全不变量
除非业务明确提供经过严格 Sanitizer 的富文本能力，否则不可信内容只能作为数据，不能成为 HTML/JavaScript/URL/CSS 可执行语法。

## 推荐修复
- 使用框架默认 escaped rendering。
- 无需 HTML 时将 `innerHTML`/raw HTML Sink 改成 `textContent` 等文本 API。
- 富文本业务使用项目批准的 Sanitizer + 明确策略，并靠近 Trust Boundary 处理。
- 根据实际 Context 选择对应编码，不可“一次 HTML Encode 到处使用”。

## 注意
修复必须保持正常展示语义，并检查存储型 XSS 的所有主要输出点。

## Strategy: `open-redirect` — 开放重定向

## 安全不变量
用户可控跳转参数不能将用户重定向到任意攻击者控制的外部站点。

## 修复原则
- 能使用站内路径时优先只允许相对路径。
- 必须支持外域时使用解析后的 Scheme/Host/Port 精确 Allowlist。
- 处理协议相对 URL、UserInfo、编码、大小写等解析差异。
- 禁止 `startsWith("https://trusted.com")` 之类字符串前缀判断。

## Strategy: `cors-misconfiguration` — CORS 配置

## 安全不变量
跨域浏览器访问只能来自明确可信的 Origin，并只开放业务真正需要的方法、Header 和 Credential 行为。

## 修复原则
- 优先使用配置化的 Origin Allowlist。
- Credential 场景禁止无约束 Origin。
- 不要使用字符串前缀/后缀匹配伪造域名白名单。
- 如果无法从项目配置和部署信息推断生产可信域名，必须要求人工确认，不能猜域名。

## Strategy: `csrf` — CSRF

## 安全不变量
依赖 Cookie/Session 等浏览器自动携带凭据的状态变更请求，不能被第三方站点伪造。

## 修复原则
- Session/Cookie 鉴权：优先启用框架 CSRF 防护并确保前端发送 Token。
- Authorization Header 等非 Ambient Credential API：先判断 CSRF 是否真正适用。
- OAuth/SSO 等流程同时关注 `state` 等防伪机制。
- 不允许不理解认证模型就简单删除 `csrf.disable()` 或盲目开启 CSRF。

## Strategy: `security-headers` — 安全响应头

## 安全不变量
浏览器安全策略应与应用真实部署方式一致，降低 XSS、Clickjacking、MIME Sniffing、降级访问等风险。

## 重点
- CSP / `frame-ancestors`
- HSTS
- `X-Content-Type-Options`
- `Referrer-Policy`
- 必要时的 `Permissions-Policy`

## 注意
- 不机械生成过严 CSP 导致业务不可用。
- HSTS 只应在确认 HTTPS 部署边界后启用。
- 优先使用 Spring Security / Web 框架统一 Header 配置。

## Strategy: `crlf-injection` — CRLF / Header Injection

## 安全不变量
不可信数据不能注入额外 HTTP Header 行或造成响应拆分。

## 修复原则
- 使用框架提供的结构化 Header API。
- Content-Disposition 优先使用安全 Builder/Encoder。
- 对外部派生 Header 值拒绝 CR/LF 等控制字符。
- 不要依赖几个 `replace()` 拼凑过滤规则。

## Strategy: `host-header-injection` — Host Header Injection

## 安全不变量
不可信 `Host` / `Forwarded` / `X-Forwarded-*` 不能影响密码重置链接、回调地址、安全敏感绝对 URL 或信任决策。

## 修复原则
- 安全敏感外部 URL 优先使用配置的 canonical public base URL。
- 需要反向代理 Header 时使用框架可信代理机制，并限定可信代理边界。
- 禁止直接字符串拼接 `request.getHeader("Host")` 生成安全链接。
