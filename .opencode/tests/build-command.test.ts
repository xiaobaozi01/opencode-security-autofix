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
    const result = await resolveBuildCommand(root, { mode: "test" })
    assert.equal(result.command, undefined)
    assert.match(result.reason ?? "", /未配置 test/)
  })
})

test("Node 针对性测试选择器会作为独立参数传入", async () => {
  await project({ "package.json": JSON.stringify({ scripts: { test: "vitest" } }) }, async root => {
    const result = await resolveBuildCommand(root, { mode: "test", test: "user.test.ts" })
    assert.deepEqual(result.command, ["npm", "run", "test", "--", "user.test.ts"])
  })
})

test("Gradle compile 使用 classes 而不是完整 build", async () => {
  await project({ "build.gradle": "plugins {}" }, async root => {
    const result = await resolveBuildCommand(root, { mode: "compile", module: "api" })
    assert.deepEqual(result.command, ["gradle", ":api:classes", "-x", "test"])
  })
})

test("支持 Python、Go 和 .NET 命令解析", async () => {
  await project({ "pyproject.toml": "[build-system]\n" }, async root => {
    assert.deepEqual(
      (await resolveBuildCommand(root, { mode: "test", ecosystem: "python", test: "tests/test_api.py" })).command,
      ["python3", "-m", "pytest", "tests/test_api.py"],
    )
  })
  await project({ "go.mod": "module example.com/demo\n" }, async root => {
    assert.deepEqual(
      (await resolveBuildCommand(root, { mode: "test", ecosystem: "go", test: "TestLogin" })).command,
      ["go", "test", "-run", "TestLogin", "./..."],
    )
  })
  await project({ "Demo.sln": "" }, async root => {
    assert.deepEqual(
      (await resolveBuildCommand(root, { mode: "test", ecosystem: "dotnet", test: "LoginTests" })).command,
      ["dotnet", "test", "Demo.sln", "--filter", "LoginTests"],
    )
  })
})

test("多语言项目可以显式选择构建系统", async () => {
  await project(
    {
      "package.json": JSON.stringify({ scripts: { test: "vitest" } }),
      "go.mod": "module example.com/demo\n",
    },
    async root => {
      const result = await resolveBuildCommand(root, { mode: "build", ecosystem: "go" })
      assert.equal(result.ecosystem, "go")
      assert.deepEqual(result.command, ["go", "build", "./..."])
    },
  )
})
