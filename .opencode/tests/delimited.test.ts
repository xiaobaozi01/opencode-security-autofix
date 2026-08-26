import assert from "node:assert/strict"
import test from "node:test"
import { parseDelimited } from "../lib/security-autofix/report/builtin/delimited.adapter.ts"

test("CSV 支持引号字段内换行和转义引号", () => {
  const rows = parseDelimited(
    'id,description,evidence\r\n1,"first line\nsecond line","say ""hello"""\r\n',
    ",",
  )
  assert.deepEqual(rows, [
    { id: "1", description: "first line\nsecond line", evidence: 'say "hello"' },
  ])
})

test("TSV、BOM、空行和缺失单元格可正常处理", () => {
  const rows = parseDelimited("\uFEFFid\ttitle\tnote\n\n1\tSQL Injection\n", "\t")
  assert.deepEqual(rows, [{ id: "1", title: "SQL Injection", note: "" }])
})

test("未闭合引号会明确失败", () => {
  assert.throws(() => parseDelimited('id,title\n1,"broken', ","), /未闭合/)
})
