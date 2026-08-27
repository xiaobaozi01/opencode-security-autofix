import {
  findingIdentity,
  findingIdentityKeys,
  type FindingIdentityInput,
  type FindingIdentityStrength,
} from "./identity.ts"

export type FindingComparisonStatus = "PRESENT" | "ABSENT" | "INDETERMINATE"

export interface FindingComparison {
  status: FindingComparisonStatus
  reason: string
  identityStrength: FindingIdentityStrength
  findingKey?: string
  matchedFinding?: FindingIdentityInput
  matchCount: number
}

function matchingFindings(anchor: FindingIdentityInput, findings: FindingIdentityInput[]) {
  const anchorKeys = findingIdentityKeys(anchor)
  for (const kind of ["fingerprint", "identifier", "location"] as const) {
    const key = anchorKeys[kind]
    if (!key) continue
    const matches = findings.filter(finding => findingIdentityKeys(finding)[kind] === key)
    if (matches.length) return { kind, key, matches }
  }
  return undefined
}

export function locateFinding(
  anchor: FindingIdentityInput,
  findings: FindingIdentityInput[],
): FindingComparison {
  const identity = findingIdentity(anchor)
  const matched = matchingFindings(anchor, findings)
  if (matched) {
    const strength = matched.kind === "fingerprint"
      ? "FINGERPRINT"
      : matched.kind === "identifier"
        ? "IDENTIFIER"
        : "LOCATION"
    return {
      status: "PRESENT",
      reason: `报告中存在 ${strength} 身份匹配的 Finding`,
      identityStrength: strength,
      findingKey: matched.key,
      matchedFinding: matched.matches[0],
      matchCount: matched.matches.length,
    }
  }

  if (identity.strength === "FINGERPRINT") {
    return {
      status: "ABSENT",
      reason: "报告中不存在相同 Scanner、Rule 和 Fingerprint 的 Finding",
      identityStrength: identity.strength,
      findingKey: identity.key,
      matchCount: 0,
    }
  }

  return {
    status: "INDETERMINATE",
    reason: "缺少可用于确认 Finding 已消失的稳定 Fingerprint",
    identityStrength: identity.strength,
    findingKey: identity.key,
    matchCount: 0,
  }
}

export interface BaselineRescanComparison {
  status: FindingComparisonStatus
  reason: string
  baseline: FindingComparison
  rescan?: FindingComparison
}

export function compareBaselineAndRescan(
  original: FindingIdentityInput,
  baselineFindings: FindingIdentityInput[],
  rescanFindings?: FindingIdentityInput[],
): BaselineRescanComparison {
  const baseline = locateFinding(original, baselineFindings)
  if (!rescanFindings) {
    return {
      status: baseline.status,
      reason: baseline.reason,
      baseline,
    }
  }
  if (baseline.status !== "PRESENT" || !baseline.matchedFinding) {
    return {
      status: "INDETERMINATE",
      reason: "修复前基线报告未能确定性复现原 Finding",
      baseline,
    }
  }

  const rescan = locateFinding(baseline.matchedFinding, rescanFindings)
  return {
    status: rescan.status,
    reason: rescan.reason,
    baseline,
    rescan,
  }
}
