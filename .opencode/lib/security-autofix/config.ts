import path from "path"

export const CONFIG_RELATIVE_PATH = ".opencode/security-autofix.json"

export interface SecurityAutofixConfig {
  scanner?: Record<string, any>
  results?: {
    outputDir?: string
    writeJsonSidecar?: boolean
  }
}

export async function loadSecurityAutofixConfig(worktreeRoot: string): Promise<{
  path: string
  config: SecurityAutofixConfig
}> {
  const configPath = path.join(path.resolve(worktreeRoot), CONFIG_RELATIVE_PATH)
  if (!(await Bun.file(configPath).exists())) {
    return { path: configPath, config: {} }
  }

  try {
    return {
      path: configPath,
      config: await Bun.file(configPath).json(),
    }
  } catch (error) {
    throw new Error(
      `Security AutoFix 配置文件解析失败：${CONFIG_RELATIVE_PATH}：${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}
