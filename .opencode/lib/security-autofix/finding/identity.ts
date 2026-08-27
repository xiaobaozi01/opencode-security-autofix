import { createHash } from "node:crypto"
import path from "node:path"
import type { RuleIdentity } from "./types.ts"

export type FindingIdentityStrength = "FINGERPRINT" | "IDENTIFIER" | "LOCATION" | "NONE"

export interface FindingIdentityInput {
  id?: string
  original_id?: string
  rule?: RuleIdentity
  location?: {
    file?: string
    start_line?: number
    end_line?: number
    method?: string
  }
}

export interface FindingIdentity {
  key?: string
  strength: FindingIdentityStrength
  evidence: string[]
}

export interface FindingIdentityKeys {
  fingerprint?: string
  identifier?: string
  location?: string
}

function value(input: unknown) {
  return typeof input === "string" && input.trim() ? input.trim() : undefined
}

function normalized(input: unknown) {
  return value(input)?.toLowerCase()
}

function normalizedFile(input: unknown) {
  const file = value(input)
  return file ? path.normalize(file).replace(/\\/g, "/").toLowerCase() : undefined
}

function digest(parts: string[]) {
  return createHash("sha256").update(parts.join("\0")).digest("hex")
}

function ruleParts(input: FindingIdentityInput) {
  const scanner = normalized(input.rule?.scanner)
  const ruleId = normalized(input.rule?.rule_id)
  return scanner && ruleId ? [scanner, ruleId] : undefined
}

export function findingIdentityKeys(input: FindingIdentityInput): FindingIdentityKeys {
  const rule = ruleParts(input)
  const fingerprint = value(input.rule?.fingerprint)
  const id = value(input.original_id) ?? value(input.id)
  const file = normalizedFile(input.location?.file)
  const method = normalized(input.location?.method)
  const startLine = Number.isFinite(input.location?.start_line)
    ? String(input.location?.start_line)
    : undefined

  return {
    fingerprint: rule && fingerprint
      ? `finding:fp:${digest([...rule, fingerprint])}`
      : undefined,
    identifier: rule && id ? `finding:id:${digest([...rule, id])}` : undefined,
    location: rule && file && (method || startLine)
      ? `finding:location:${digest([...rule, file, method ?? `line:${startLine}`])}`
      : undefined,
  }
}

export function findingIdentity(input: FindingIdentityInput): FindingIdentity {
  const rule = ruleParts(input)
  const fingerprint = value(input.rule?.fingerprint)
  const id = value(input.original_id) ?? value(input.id)
  const file = normalizedFile(input.location?.file)
  const method = normalized(input.location?.method)
  const startLine = Number.isFinite(input.location?.start_line)
    ? String(input.location?.start_line)
    : undefined
  const keys = findingIdentityKeys(input)

  if (keys.fingerprint) {
    return {
      key: keys.fingerprint,
      strength: "FINGERPRINT",
      evidence: [`scanner:${rule?.[0]}`, `rule:${rule?.[1]}`, "fingerprint"],
    }
  }
  if (keys.identifier) {
    return {
      key: keys.identifier,
      strength: "IDENTIFIER",
      evidence: [`scanner:${rule?.[0]}`, `rule:${rule?.[1]}`, `id:${id}`],
    }
  }
  if (keys.location) {
    return {
      key: keys.location,
      strength: "LOCATION",
      evidence: [
        `scanner:${rule?.[0]}`,
        `rule:${rule?.[1]}`,
        `file:${file}`,
        method ? `method:${method}` : `line:${startLine}`,
      ],
    }
  }

  return {
    strength: "NONE",
    evidence: [],
  }
}

export function withFindingIdentity<T extends FindingIdentityInput>(finding: T): T & {
  finding_key?: string
  finding_key_strength: FindingIdentityStrength
} {
  const identity = findingIdentity(finding)
  return {
    ...finding,
    finding_key: identity.key,
    finding_key_strength: identity.strength,
  }
}
