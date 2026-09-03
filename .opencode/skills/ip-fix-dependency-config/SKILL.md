---
name: ip-fix-dependency-config
description: "当 FixPlan 处理第三方依赖漏洞、传递依赖或锁文件更新时使用。"
---

# Dependency Security Strategy

## Strategy: `dependency-vulnerability`

**安全不变量：** 最终解析出的依赖图不能继续包含报告所指的受影响版本或传递路径。

- 优先最小安全版本升级或 dependency-management override。
- 检查传递依赖和 lockfile 的真实解析结果。
- 避免无必要的框架大版本升级。
- 必须通过 Build/Test 验证兼容性。
- 依赖升级存在 Breaking Change 风险时使用 `AUTO_FIX_WITH_REVIEW`。

仅按 `ip-fix-planner` 锁定的依赖和文件范围修改；不要借机批量升级其他依赖。
