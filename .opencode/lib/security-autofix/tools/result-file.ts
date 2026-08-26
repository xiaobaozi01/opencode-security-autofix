import path from "node:path"
import { writeFile } from "node:fs/promises"

function isAlreadyExists(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "EEXIST")
}

export async function writeUniqueTextFile(directory: string, filename: string, content: string) {
  const extension = path.extname(filename)
  const stem = filename.slice(0, filename.length - extension.length)

  for (let index = 0; index < 1000; index++) {
    const suffix = index === 0 ? "" : `-${String(index).padStart(2, "0")}`
    const candidate = path.join(directory, `${stem}${suffix}${extension}`)
    try {
      await writeFile(candidate, content, { encoding: "utf8", flag: "wx" })
      return candidate
    } catch (error) {
      if (!isAlreadyExists(error)) throw error
    }
  }

  throw new Error("同一时间戳下的 Security AutoFix 报告数量超过限制")
}
