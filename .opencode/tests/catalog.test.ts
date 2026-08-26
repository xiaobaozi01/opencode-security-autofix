import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { listRepairEntries, resolveRepairEntry } from "../lib/security-autofix/repair/catalog.ts"

test("36 条内置 Repair 路由保持完整", () => {
  assert.equal(listRepairEntries().length, 36)
})

test("每条 Repair 路由都能找到对应 Skill strategy", async () => {
  const skillsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../skills")
  for (const entry of listRepairEntries()) {
    const content = await readFile(path.join(skillsRoot, entry.provider, "SKILL.md"), "utf8")
    assert.ok(content.includes("Strategy: `" + entry.strategy + "`"), entry.id)
  }
})

test("常见语言别名可以匹配 Catalog", () => {
  assert.equal(resolveRepairEntry("SQL_INJECTION", "Node.js")?.id, "sql-injection.generic")
  assert.equal(resolveRepairEntry("SQL_INJECTION", "C#")?.id, "sql-injection.generic")
  assert.equal(resolveRepairEntry("DEPENDENCY_VULNERABILITY", "Golang")?.id, "dependency-vulnerability.generic")
})

test("常见框架别名被规范化", () => {
  assert.equal(resolveRepairEntry("JWT_SECURITY", "Java", "Spring Security")?.id, "jwt-security.generic")
  assert.equal(
    resolveRepairEntry("DEPENDENCY_VULNERABILITY", "Go", "go.mod")?.id,
    "dependency-vulnerability.generic",
  )
})
