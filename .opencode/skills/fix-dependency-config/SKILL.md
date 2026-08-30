---
name: fix-dependency-config
description: "当 FixPlan 处理第三方依赖漏洞、传递依赖或锁文件更新时使用。"
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

## Strategy: `dependency-vulnerability` — 第三方依赖漏洞

## 安全不变量
最终解析出的依赖图中不能继续包含报告所指的受漏洞影响版本/传递路径。

## 修复原则
- 优先最小安全版本升级或 dependency management override。
- 检查传递依赖和 lockfile 的真实解析结果。
- 避免无必要的框架大版本升级。
- 必须通过 Build/Test 验证兼容性。
- 通常使用 `AUTO_FIX_WITH_REVIEW`，因为依赖升级可能存在 Breaking Change。
