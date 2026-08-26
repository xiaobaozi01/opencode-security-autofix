import { type Plugin } from "@opencode-ai/plugin"
import { registerBuiltinReportAdapters } from "../lib/security-autofix/report/registry"
import { registerBuiltinScannerAdapters } from "../lib/security-autofix/scanner/registry"
import { autofixReportTool } from "../lib/security-autofix/tools/report"
import { autofixScanTool } from "../lib/security-autofix/tools/scan"
import { autofixBuildTool } from "../lib/security-autofix/tools/build"
import { autofixResultTool } from "../lib/security-autofix/tools/result"
import { autofixRepairTool } from "../lib/security-autofix/tools/repair"
import { autofixClassifyTool } from "../lib/security-autofix/tools/classify"

export const SecurityAutofixPlugin: Plugin = async () => {
  registerBuiltinReportAdapters()
  registerBuiltinScannerAdapters()

  return {
    tool: {
      autofix_report: autofixReportTool,
      autofix_classify: autofixClassifyTool,
      autofix_scan: autofixScanTool,
      autofix_build: autofixBuildTool,
      autofix_result: autofixResultTool,
      autofix_repair: autofixRepairTool,
    },
  }
}
