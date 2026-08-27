import assert from "node:assert/strict"
import { mkdtemp, mkdir, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import {
  listBuildTasks,
  resolveBuildTask,
  type BuildConfiguration,
} from "../lib/security-autofix/tools/build-task.ts"

async function project(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "autofix-build-task-test-"))
  try {
    await run(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test("列出 Task 时返回选择所需元数据并按 ID 排序", () => {
  const tasks = listBuildTasks({
    tasks: {
      test: { kind: "test", command: ["npm", "test"], paths: ["src/**"] },
      build: {
        kind: "build",
        command: ["npm", "run", "build"],
        cwd: "frontend",
        description: "构建前端",
      },
    },
  })
  assert.deepEqual(tasks, [
    { id: "build", kind: "build", cwd: "frontend", paths: [], description: "构建前端" },
    { id: "test", kind: "test", cwd: ".", paths: ["src/**"], description: undefined },
  ])
  assert.deepEqual(listBuildTasks(undefined), [])
})

test("未知 Task 返回 NOT_RUN 原因所需信息和可用列表", async () => {
  await project(async root => {
    const result = await resolveBuildTask(root, { task: "missing" }, {
      tasks: { build: { kind: "build", command: ["make"] } },
    })
    assert.equal(result.command, undefined)
    assert.match(result.reason ?? "", /未配置 Build Task/)
    assert.equal(result.availableTasks[0]?.id, "build")

    const inheritedName = await resolveBuildTask(root, { task: "toString" }, {
      tasks: { build: { kind: "build", command: ["make"] } },
    })
    assert.match(inheritedName.reason ?? "", /未配置 Build Task/)
  })
})

test("{args} 会在指定位置展开为多个 argv", async () => {
  await project(async root => {
    const result = await resolveBuildTask(
      root,
      { task: "backend-build", args: ["-s", "/tmp/settings.xml", "-Pcompany"] },
      {
        tasks: {
          "backend-build": {
            kind: "build",
            command: ["./mvnw", "{args}", "package"],
          },
        },
      },
    )
    assert.deepEqual(result.command, ["./mvnw", "-s", "/tmp/settings.xml", "-Pcompany", "package"])
  })
})

test("没有运行参数时直接移除 {args}", async () => {
  await project(async root => {
    const result = await resolveBuildTask(root, { task: "build" }, {
      tasks: { build: { kind: "build", command: ["./mvnw", "{args}", "package"] } },
    })
    assert.deepEqual(result.command, ["./mvnw", "package"])
  })
})

test("命令未放置 {args} 时将运行参数追加到末尾", async () => {
  await project(async root => {
    const result = await resolveBuildTask(root, { task: "test", args: ["--runInBand"] }, {
      tasks: { test: { kind: "test", command: ["pnpm", "test", "--"] } },
    })
    assert.deepEqual(result.command, ["pnpm", "test", "--", "--runInBand"])
  })
})

test("省略 cwd 时在项目根目录执行", async () => {
  await project(async root => {
    const result = await resolveBuildTask(root, { task: "build" }, {
      tasks: { build: { kind: "build", command: ["make"] } },
    })
    assert.equal(result.cwd, root)
  })
})

test("支持项目内 cwd 和有限路径变量展开", async () => {
  await project(async root => {
    await mkdir(path.join(root, "backend"))
    const result = await resolveBuildTask(root, {
      task: "build",
      args: ["${userHome}/.m2/settings.xml"],
    }, {
      tasks: {
        build: {
          kind: "build",
          cwd: "backend",
          command: ["${workspaceFolder}/mvnw", "{args}", "package"],
        },
      },
    })
    assert.equal(result.cwd, path.join(root, "backend"))
    assert.deepEqual(result.command, [
      path.join(root, "mvnw"),
      path.join(os.homedir(), ".m2/settings.xml"),
      "package",
    ])
  })
})

test("调用环境变量和超时覆盖 Task 默认值", async () => {
  await project(async root => {
    const config: BuildConfiguration = {
      tasks: {
        build: {
          kind: "build",
          command: ["make"],
          env: { CI: "false", BASE: "yes" },
          timeoutMs: 300000,
        },
      },
    }
    const result = await resolveBuildTask(
      root,
      { task: "build", env: { CI: "true" }, timeoutMs: 600000 },
      config,
    )
    assert.deepEqual(result.env, { CI: "true", BASE: "yes" })
    assert.equal(result.timeoutMs, 600000)
  })
})

test("{args} 只能作为一个独立插入点", async () => {
  await project(async root => {
    const embedded = await resolveBuildTask(root, { task: "build" }, {
      tasks: { build: { kind: "build", command: ["make", "--flag={args}"] } },
    })
    assert.match(embedded.reason ?? "", /独立数组元素/)

    const repeated = await resolveBuildTask(root, { task: "build" }, {
      tasks: { build: { kind: "build", command: ["make", "{args}", "{args}"] } },
    })
    assert.match(repeated.reason ?? "", /最多只能包含一个/)

    const executable = await resolveBuildTask(root, { task: "build", args: ["make"] }, {
      tasks: { build: { kind: "build", command: ["{args}"] } },
    })
    assert.match(executable.reason ?? "", /固定可执行程序/)
  })
})

test("Task kind 和 command 必须有效", async () => {
  await project(async root => {
    const invalidKind = await resolveBuildTask(root, { task: "build" }, {
      tasks: { build: { kind: "deploy" as any, command: ["make"] } },
    })
    assert.match(invalidKind.reason ?? "", /kind 必须是/)

    const invalidCommand = await resolveBuildTask(root, { task: "build" }, {
      tasks: { build: { kind: "build", command: [] } },
    })
    assert.match(invalidCommand.reason ?? "", /缺少有效的 command/)
  })
})

test("timeoutMs 必须位于允许范围内", async () => {
  await project(async root => {
    const result = await resolveBuildTask(root, { task: "build", timeoutMs: 999 }, {
      tasks: { build: { kind: "build", command: ["make"] } },
    })
    assert.match(result.reason ?? "", /1000 和 3600000/)
  })
})

test("cwd 不存在或越出工作区时返回明确原因", async () => {
  await project(async root => {
    const missing = await resolveBuildTask(root, { task: "build" }, {
      tasks: { build: { kind: "build", cwd: "missing", command: ["make"] } },
    })
    assert.match(missing.reason ?? "", /cwd 不存在/)

    const outside = await resolveBuildTask(root, { task: "build" }, {
      tasks: { build: { kind: "build", cwd: "..", command: ["make"] } },
    })
    assert.match(outside.reason ?? "", /必须位于项目工作区内/)
  })
})
