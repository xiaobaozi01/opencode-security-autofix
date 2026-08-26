---
name: fix-request-security
description: "修复 SSRF、路径遍历、Zip Slip 与不安全文件上传等请求/资源访问边界问题。"
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

## Strategy: `ssrf` — SSRF

## 安全不变量
用户输入不能让服务端访问未经授权的网络目标。

## 推荐修复
- 最优方案：外部输入只选择逻辑 Destination ID，再映射到可信 Base URL。
- 业务必须允许任意 URL 时，明确限制 Scheme/Host/Port，并使用正确 URL Parser。
- 根据业务安全边界处理 DNS/IP 解析和内网/Metadata 地址。
- 禁止或重新验证 Redirect，不能只校验第一次 URL。

## 禁止伪修复
- `url.startsWith("https://trusted")`
- `host.contains("trusted.com")`
- 简单字符串黑名单

复杂 Allowlist、代理、服务发现或内部网络策略通常至少 `AUTO_FIX_WITH_REVIEW`。

## Strategy: `path-traversal` — 路径遍历

## 安全不变量
用户可控路径经过解析后必须仍然位于授权的可信基目录内；压缩包 Entry 也不能逃逸目标目录。

## 推荐修复
- 使用 `Path.resolve(...).normalize()` 后做目录边界判断；在涉及符号链接时按业务需要使用真实路径/安全文件 API。
- 对绝对路径、`..`、Windows 分隔符、编码后的路径都依赖规范化结果而非字符串黑名单。
- 解压时每个 Entry 都必须独立做目标路径边界校验。
- 保持原有合法子目录行为。

## Strategy: `zip-slip` — Zip Slip

本策略沿用路径边界/规范化原则，并重点检查解压条目名在目标目录下的 canonical/normalized path 约束。

## 安全不变量
用户可控路径经过解析后必须仍然位于授权的可信基目录内；压缩包 Entry 也不能逃逸目标目录。

## 推荐修复
- 使用 `Path.resolve(...).normalize()` 后做目录边界判断；在涉及符号链接时按业务需要使用真实路径/安全文件 API。
- 对绝对路径、`..`、Windows 分隔符、编码后的路径都依赖规范化结果而非字符串黑名单。
- 解压时每个 Entry 都必须独立做目标路径边界校验。
- 保持原有合法子目录行为。

## Strategy: `unsafe-file-upload` — 不安全文件上传

## 安全不变量
上传内容不能利用客户端文件名逃逸目录、覆盖任意文件，或因为被放入可执行/静态目录而直接获得执行能力。

## 修复原则
- 服务端生成存储名，原始文件名仅作为展示元数据。
- 设置合理大小限制。
- 根据业务需要使用项目认可方式校验文件类型/内容。
- 存储目录优先位于 Web 可执行/静态根目录之外。
- 路径处理同时遵循 Path Traversal 安全不变量。
