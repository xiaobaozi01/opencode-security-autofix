import assert from "node:assert/strict"
import test from "node:test"
import {
  mergeEnvironment,
  prepareSpawnCommand,
  processTreeTerminationPlan,
} from "../lib/security-autofix/process/spawn.ts"

test("Windows 通过 PATH/PATHEXT 解析 cmd/bat，原生 exe 和 POSIX 保持直接 argv", () => {
  const maven = prepareSpawnCommand(
    ["mvn", "-s", "C:\\Program Files\\Maven\\settings.xml", "package"],
    {
      platform: "win32",
      cwd: "C:\\workspace",
      env: { Path: "C:\\Tools\\Maven\\bin", ComSpec: "C:\\Windows\\System32\\cmd.exe" },
      resolveExecutable: () => "C:\\Tools\\Maven\\bin\\mvn.cmd",
    },
  )
  assert.equal(maven.launcher, "CMD")
  assert.equal(maven.command[0], "C:\\Windows\\System32\\cmd.exe")
  assert.deepEqual(maven.command.slice(1, 4), ["/d", "/s", "/c"])
  assert.match(maven.command[4], /mvn\.cmd/i)
  assert.match(maven.command[4], /settings\.xml/i)
  assert.equal(maven.windowsVerbatimArguments, true)

  const java = prepareSpawnCommand(["java", "-version"], {
    platform: "win32",
    cwd: "C:\\workspace",
    env: {},
    resolveExecutable: () => "C:\\Java\\bin\\java.exe",
  })
  assert.deepEqual(java.command, ["C:\\Java\\bin\\java.exe", "-version"])
  assert.equal(java.launcher, "DIRECT")

  const posix = prepareSpawnCommand(["mvn", "package"], {
    platform: "darwin",
    cwd: "/workspace",
    env: {},
    resolveExecutable: () => {
      throw new Error("POSIX 不应预解析命令")
    },
  })
  assert.deepEqual(posix.command, ["mvn", "package"])
  assert.equal(posix.launcher, "DIRECT")
})

test("Windows 环境变量覆盖按名称大小写不敏感合并", () => {
  assert.deepEqual(
    mergeEnvironment({ Path: "OLD", TEMP: "one" }, { PATH: "NEW", temp: "two" }, "win32"),
    { Path: "NEW", TEMP: "two" },
  )
  assert.deepEqual(
    mergeEnvironment({ Path: "OLD" }, { PATH: "NEW" }, "darwin"),
    { Path: "OLD", PATH: "NEW" },
  )
})

test("超时终止计划覆盖 Windows 进程树和 POSIX 进程组", () => {
  assert.deepEqual(processTreeTerminationPlan(1234, "win32"), {
    kind: "WINDOWS_TASKKILL",
    command: ["taskkill.exe", "/pid", "1234", "/t", "/f"],
  })
  assert.deepEqual(processTreeTerminationPlan(1234, "linux"), {
    kind: "POSIX_PROCESS_GROUP",
    processGroupId: -1234,
  })
})
