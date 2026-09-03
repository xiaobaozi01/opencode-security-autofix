---
name: ip-fix-request-security
description: "当 FixPlan 处理 SSRF、路径遍历、Zip Slip 或不安全文件上传时使用。"
---

# Request, URL & File Security Strategies

## Strategy: `ssrf`

**安全不变量：** 用户输入不能让服务端访问未经授权的网络目标。

- 最优：外部输入只选择逻辑 Destination ID，再映射可信 Base URL。
- 必须允许 URL 时，使用正确 Parser 限定 Scheme/Host/Port，并按业务边界处理 DNS/IP 与内网/Metadata 地址。
- Redirect 必须禁止或重新验证，不能只校验第一次 URL。
- 禁止 `startsWith`、`contains` 等字符串伪白名单。
- 复杂网络 allowlist/代理/服务发现通常至少 `AUTO_FIX_WITH_REVIEW`。

## Strategy: `path-traversal`

**安全不变量：** 用户可控路径解析后必须仍位于授权可信基目录内。

- 使用 `Path.resolve(...).normalize()` 后做目录边界判断；涉及符号链接时按业务要求使用真实路径/安全 API。
- 不依赖 `..`、分隔符等字符串黑名单。
- 保持合法子目录能力。

## Strategy: `zip-slip`

**安全不变量：** 每个压缩条目的目标路径都必须位于解压目标目录内。

- 每个 Entry 独立做 normalized/canonical 边界检查。
- 不因为顶层目标目录安全就信任 Entry 名。

## Strategy: `unsafe-file-upload`

**安全不变量：** 上传内容不能利用客户端文件名逃逸目录、覆盖任意文件，或因落入可执行/静态目录而获得执行能力。

- 服务端生成存储名，原始文件名只作展示元数据。
- 设置合理大小限制，并按业务使用项目认可的文件类型/内容校验。
- 存储目录优先在 Web 可执行/静态根之外。
- 路径处理同时满足 Path Traversal 安全不变量。
