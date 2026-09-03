---
name: ip-fix-crypto-secret
description: "当 FixPlan 处理弱密码学、TLS 校验、硬编码 Secret 或敏感日志时使用。"
---

# Crypto, TLS & Secret Security Strategies

## 使用契约

只执行 `ip-fix-planner` 选定的 strategy。需要真实密钥、生产 Trust Store、凭据轮换或历史数据迁移时，不得猜测，转人工处理。

## Strategy: `weak-crypto`

**安全不变量：** 安全用途使用项目批准的现代算法，并正确处理 Key、Nonce/IV、认证标签、随机数和验证流程。

- 区分普通校验和与安全密码学用途，不机械替换所有 MD5/SHA1。
- 对称加密优先项目认可的认证加密模式，禁止固定/重复 Nonce。
- 密码存储使用专用密码哈希方案。
- 不生成、硬编码或猜测密钥。
- 历史密文/密码格式迁移通常至少 `AUTO_FIX_WITH_REVIEW`。

## Strategy: `tls-trust-all`

**安全不变量：** TLS 对端必须经过正常证书链和主机名校验；私有 PKI 通过明确 Trust Store 信任，而不是关闭校验。

- 删除 Trust-All `TrustManager`。
- 删除始终返回 true 的 `HostnameVerifier`。
- 移除 `NoopHostnameVerifier` 和关闭证书校验的配置。
- 复用项目已有 Trust Store/CA 配置。

## Strategy: `hardcoded-secret`

**安全不变量：** 可复用 Secret 不应硬编码在源码、配置模板、测试产物或日志中。

- 改为环境变量、Secret Manager、部署注入或项目既有凭据机制。
- 不把真实 Secret 搬到另一个仍提交 Git 的文件。
- 示例配置只使用占位符。
- 已暴露凭据仍需人工 Rotation/Revoke；源码外置不能消除既往泄露影响。

## Strategy: `sensitive-logging`

**安全不变量：** 日志不能包含密码、可复用认证材料、密钥、完整 Token 或超出必要范围的敏感数据。

- 首选不记录敏感值。
- 确需记录标识符时复用已有脱敏组件。
- 检查对象 `toString()`、异常上下文、HTTP Header/Body Debug Logging 等间接泄露路径。
