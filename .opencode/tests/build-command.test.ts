import assert from "node:assert/strict"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { resolveBuildCommand } from "../lib/security-autofix/tools/build-command.ts"

async function project(
  files: Record<string, string>,
  run: (directory: string) => Promise<void>,
) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "autofix-build-test-"))
  try {
    for (const [name, content] of Object.entries(files)) {
      const target = path.join(directory, name)
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, content)
    }
    await run(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test("Node 项目缺少 test script 时返回 NOT_RUN 原因", async () => {
  await project({ "package.json": JSON.stringify({ scripts: { build: "vite build" } }) }, async root => {
    const result = await resolveBuildCommand(root, { action: "test", adapter: "node" })
    assert.equal(result.command, undefined)
    assert.match(result.reason ?? "", /未配置 test/)
  })
})

test("Node 针对性测试选择器会作为独立参数传入", async () => {
  await project({ "package.json": JSON.stringify({ scripts: { test: "vitest" } }) }, async root => {
    const result = await resolveBuildCommand(root, {
      action: "test",
      adapter: "node",
      testSelector: "user.test.ts",
    })
    assert.deepEqual(result.command, ["npm", "run", "test", "--", "user.test.ts"])
  })
})

test("Gradle compile 使用 classes 而不是完整 build", async () => {
  await project({ "build.gradle": "plugins {}" }, async root => {
    const result = await resolveBuildCommand(root, {
      action: "compile",
      adapter: "gradle",
      options: { gradle: { module: "api" } },
    })
    assert.deepEqual(result.command, ["gradle", ":api:classes", "-x", "test"])
  })
})

test("支持 Python 命令解析", async () => {
  await project({ "pyproject.toml": "[build-system]\n" }, async root => {
    assert.deepEqual(
      (await resolveBuildCommand(root, {
        action: "test",
        adapter: "python",
        testSelector: "tests/test_api.py",
      })).command,
      ["python3", "-m", "pytest", "tests/test_api.py"],
    )
  })
})

test("多语言项目必须显式选择 Build Adapter", async () => {
  await project(
    {
      "package.json": JSON.stringify({ scripts: { test: "vitest" } }),
      "pyproject.toml": "[build-system]\n",
    },
    async root => {
      const result = await resolveBuildCommand(root, { action: "build", adapter: "python" })
      assert.equal(result.adapter, "python")
      assert.deepEqual(result.command, ["python3", "-m", "build", "--no-isolation"])
    },
  )
})

test("Maven 支持 settings、Profile、属性和额外 CLI 参数", async () => {
  await project(
    {
      "pom.xml": "<project />",
      "config/company-settings.xml": "<settings />",
    },
    async root => {
      const result = await resolveBuildCommand(root, {
        action: "build",
        adapter: "maven",
        options: {
          maven: {
            settings: "config/company-settings.xml",
            profiles: ["company", "release"],
            properties: { revision: "1.2.0", skipITs: "true" },
            cliArgs: ["-U"],
          },
        },
      })
      assert.deepEqual(result.command, [
        "mvn",
        "-q",
        "--settings",
        path.join(root, "config/company-settings.xml"),
        "-Pcompany,release",
        "-Drevision=1.2.0",
        "-DskipITs=true",
        "-U",
        "verify",
        "-DskipTests",
      ])
    },
  )
})

test("Gradle 区分全局参数、项目属性和任务参数", async () => {
  await project(
    {
      "build.gradle": "plugins {}",
      "config/company.init.gradle": "allprojects {}",
    },
    async root => {
      const result = await resolveBuildCommand(root, {
        action: "test",
        adapter: "gradle",
        testSelector: "com.example.LoginTest",
        options: {
          gradle: {
            initScripts: ["config/company.init.gradle"],
            projectProperties: { environment: "ci" },
            systemProperties: { "file.encoding": "UTF-8" },
            cliArgs: ["--offline"],
            taskArgs: ["--rerun"],
          },
        },
      })
      assert.deepEqual(result.command, [
        "gradle",
        "--init-script",
        path.join(root, "config/company.init.gradle"),
        "-Penvironment=ci",
        "-Dfile.encoding=UTF-8",
        "--offline",
        "test",
        "--tests",
        "com.example.LoginTest",
        "--rerun",
      ])
    },
  )
})

test("Node 支持包管理器、脚本映射和脚本参数", async () => {
  await project(
    {
      "package.json": JSON.stringify({
        scripts: { "test:ci": "vitest run", build: "vite build" },
      }),
    },
    async root => {
      const result = await resolveBuildCommand(root, {
        action: "test",
        adapter: "node",
        testSelector: "user.test.ts",
        options: {
          node: {
            packageManager: "pnpm",
            scripts: { test: "test:ci" },
            scriptArgs: ["--coverage"],
          },
        },
      })
      assert.deepEqual(result.command, [
        "pnpm",
        "run",
        "test:ci",
        "--",
        "user.test.ts",
        "--coverage",
      ])
    },
  )
})

test("Python Build 支持后端配置和额外参数", async () => {
  await project({ "pyproject.toml": "[build-system]\n" }, async root => {
    const result = await resolveBuildCommand(root, {
      action: "build",
      adapter: "python",
      options: {
        python: {
          configSettings: { "build-dir": "build/custom" },
          buildArgs: ["--wheel"],
        },
      },
    })
    assert.deepEqual(result.command, [
      "python3",
      "-m",
      "build",
      "--no-isolation",
      "-C",
      "build-dir=build/custom",
      "--wheel",
    ])
  })
})

test("Build Target、Configuration 和调用参数按优先级合并", async () => {
  await project(
    {
      "backend/pom.xml": "<project />",
      "settings/base.xml": "<settings />",
      "settings/ci.xml": "<settings />",
    },
    async root => {
      const result = await resolveBuildCommand(
        root,
        {
          action: "build",
          target: "backend",
          configuration: "ci",
          options: {
            maven: {
              properties: { revision: "2.0.0" },
              cliArgs: ["-U"],
            },
          },
        },
        {
          targets: {
            backend: {
              adapter: "maven",
              cwd: "backend",
              timeoutMs: 300000,
              env: { BUILD_ENV: "base" },
              options: {
                maven: {
                  settings: "${workspaceFolder}/settings/base.xml",
                  profiles: ["base"],
                  properties: { revision: "1.0.0" },
                },
              },
              configurations: {
                ci: {
                  timeoutMs: 600000,
                  env: { BUILD_ENV: "ci" },
                  options: {
                    maven: {
                      settings: "${workspaceFolder}/settings/ci.xml",
                      profiles: ["ci"],
                      properties: { skipITs: "true" },
                    },
                  },
                },
              },
            },
          },
        },
      )

      assert.equal(result.cwd, path.join(root, "backend"))
      assert.equal(result.timeoutMs, 600000)
      assert.deepEqual(result.env, { BUILD_ENV: "ci" })
      assert.deepEqual(result.command, [
        "mvn",
        "-q",
        "--settings",
        path.join(root, "settings/ci.xml"),
        "-Pci",
        "-Drevision=2.0.0",
        "-DskipITs=true",
        "-U",
        "verify",
        "-DskipTests",
      ])
    },
  )
})

test("未知 Target 或 Configuration 返回明确的 NOT_RUN 原因", async () => {
  await project({ "pom.xml": "<project />" }, async root => {
    const missingTarget = await resolveBuildCommand(root, { action: "build", target: "missing" })
    assert.match(missingTarget.reason ?? "", /未配置 Build Target/)

    const missingConfiguration = await resolveBuildCommand(
      root,
      { action: "build", target: "backend", configuration: "missing" },
      { targets: { backend: { adapter: "maven" } } },
    )
    assert.match(missingConfiguration.reason ?? "", /未配置 Configuration/)
  })
})

test("新接口强制在 Target 和 Adapter 之间二选一", async () => {
  await project({ "pom.xml": "<project />" }, async root => {
    const missing = await resolveBuildCommand(root, { action: "build" })
    assert.match(missing.reason ?? "", /必须指定 Build target 或 adapter/)

    const conflicting = await resolveBuildCommand(
      root,
      { action: "build", target: "backend", adapter: "maven" },
      { targets: { backend: { adapter: "maven" } } },
    )
    assert.match(conflicting.reason ?? "", /只能指定一个/)
  })
})
