import { type Plugin } from "@opencode-ai/plugin"
import { registerBuiltinReportAdapters } from "../lib/security-autofix/report/registry"
import { registerBuiltinScannerAdapters } from "../lib/security-autofix/scanner/registry"
import { autofixReportTool } from "../lib/security-autofix/tools/report"
import { autofixScanTool } from "../lib/security-autofix/tools/scan"
import { autofixBuildTool } from "../lib/security-autofix/tools/build"
import { autofixResultTool } from "../lib/security-autofix/tools/result"
import { autofixRouteTool } from "../lib/security-autofix/tools/route"
import { autofixCompareTool } from "../lib/security-autofix/tools/compare"
import { autofixPatchTool } from "../lib/security-autofix/tools/patch"

export const SecurityAutofixPlugin: Plugin = async () => {
  registerBuiltinReportAdapters()
  registerBuiltinScannerAdapters()

  return {
    tool: {
      autofix_report: autofixReportTool,
      autofix_route: autofixRouteTool,
      autofix_scan: autofixScanTool,
      autofix_build: autofixBuildTool,
      autofix_result: autofixResultTool,
      autofix_compare: autofixCompareTool,
      autofix_patch: autofixPatchTool,
    },
  }
}
