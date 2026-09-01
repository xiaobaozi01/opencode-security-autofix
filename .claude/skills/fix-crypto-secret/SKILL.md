---
name: fix-crypto-secret
description: "当 FixPlan 处理弱密码学、TLS 校验、硬编码 Secret 或敏感日志时使用。"
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

## Strategy: `weak-crypto` — 弱密码学

## 安全不变量
安全用途必须使用项目批准的现代密码算法，并正确处理 Key、Nonce/IV、认证标签、随机数和验证流程。

## 修复原则
- 区分“普通校验和”与“安全密码学用途”，不要把所有 MD5/SHA1 都机械替换。
- 对称加密优先认证加密模式（按项目标准选型），禁止固定/重复 Nonce。
- 密码存储使用专用密码哈希方案，不直接使用普通哈希。
- 不生成、硬编码或猜测密钥。
- 历史密文/密码格式迁移可能导致数据不可读，通常标记 `AUTO_FIX_WITH_REVIEW`。

## Strategy: `tls-trust-all` — TLS 证书/主机名校验绕过

## 安全不变量
TLS 对端必须经过正常证书链和主机名校验；私有 PKI 应通过明确配置的 Trust Store 信任，而不是关闭校验。

## 修复原则
- 删除 Trust-All `TrustManager`。
- 删除始终返回 true 的 `HostnameVerifier`。
- 移除 `NoopHostnameVerifier` 和关闭证书校验的配置。
- 复用项目已有 Trust Store / CA 配置。
- 开发环境临时绕过不能流入生产路径。

## Strategy: `hardcoded-secret` — 硬编码 Secret

## 安全不变量
可复用 Secret 不应硬编码在源码、配置模板、测试产物或日志中。

## 修复原则
- 改为环境变量、Secret Manager、部署注入或项目既有凭据机制。
- 不把真实 Secret 从一个文件搬到另一个仍会提交 Git 的文件。
- 示例配置使用占位符，不生成真实密码。
- **代码外置不等于泄露影响消失**：已经暴露的凭据必须单独执行 Rotation/Revoke，并在结果中明确提示人工处理。

## Strategy: `sensitive-logging` — 敏感日志泄露

## 安全不变量
日志不能包含密码、可复用认证材料、密钥、完整 Token，或超出运维必要范围的敏感数据。

## 修复原则
- 首选**不记录**敏感值。
- 确需记录标识符时使用项目已有脱敏组件。
- 不要只遮掉少量字符但仍保留可复用 Secret。
- 检查对象 `toString()`、异常上下文、HTTP Header/Body Debug Logging 等间接泄露路径。
