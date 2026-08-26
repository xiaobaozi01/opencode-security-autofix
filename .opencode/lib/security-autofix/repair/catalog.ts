export type Fixability =
  | "AUTO_FIX"
  | "AUTO_FIX_WITH_REVIEW"
  | "HUMAN_REVIEW"
  | "GUIDANCE_ONLY"
  | "NOT_SUPPORTED"

export interface RepairEntry {
  id: string
  type: string
  provider: string
  strategy: string
  name_zh?: string
  priority: number
  supported_languages: string[]
  supported_frameworks: string[]
  default_fixability: Fixability
  validators: string[]
}

const entries: RepairEntry[] = [
  {
    "id": "sql-injection.generic",
    "type": "SQL_INJECTION",
    "provider": "fix-injection",
    "name_zh": "SQL 注入",
    "priority": 100,
    "supported_languages": [
      "java",
      "python",
      "kotlin",
      "scala",
      "csharp",
      "javascript",
      "typescript"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "sql-injection"
  },
  {
    "id": "nosql-injection.generic",
    "type": "NOSQL_INJECTION",
    "provider": "fix-injection",
    "name_zh": "NoSQL 注入",
    "priority": 100,
    "supported_languages": [
      "java",
      "python",
      "javascript",
      "typescript"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "nosql-injection"
  },
  {
    "id": "command-injection.generic",
    "type": "COMMAND_INJECTION",
    "provider": "fix-injection",
    "name_zh": "命令注入",
    "priority": 100,
    "supported_languages": [
      "java",
      "python",
      "javascript",
      "typescript"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "command-injection"
  },
  {
    "id": "template-injection.generic",
    "type": "TEMPLATE_INJECTION",
    "provider": "fix-injection",
    "name_zh": "模板注入（SSTI）",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "template-injection"
  },
  {
    "id": "expression-injection.generic",
    "type": "EXPRESSION_INJECTION",
    "provider": "fix-injection",
    "name_zh": "表达式注入",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "expression-injection"
  },
  {
    "id": "xxe.generic",
    "type": "XXE",
    "provider": "fix-xml-deserialization",
    "name_zh": "XML 外部实体（XXE）",
    "priority": 100,
    "supported_languages": [
      "java",
      "python"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "xxe"
  },
  {
    "id": "xpath-injection.generic",
    "type": "XPATH_INJECTION",
    "provider": "fix-injection",
    "name_zh": "XPath 注入",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "xpath-injection"
  },
  {
    "id": "ldap-injection.generic",
    "type": "LDAP_INJECTION",
    "provider": "fix-injection",
    "name_zh": "LDAP 注入",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "ldap-injection"
  },
  {
    "id": "xml-injection.generic",
    "type": "XML_INJECTION",
    "provider": "fix-xml-deserialization",
    "name_zh": "XML 注入",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "xml-injection"
  },
  {
    "id": "dde-injection.generic",
    "type": "DDE_INJECTION",
    "provider": "fix-xml-deserialization",
    "name_zh": "DDE/公式注入",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "dde-injection"
  },
  {
    "id": "unsafe-deserialization.generic",
    "type": "UNSAFE_DESERIALIZATION",
    "provider": "fix-xml-deserialization",
    "name_zh": "不安全反序列化",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "unsafe-deserialization"
  },
  {
    "id": "open-redirect.generic",
    "type": "OPEN_REDIRECT",
    "provider": "fix-web-security",
    "name_zh": "开放重定向",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "open-redirect"
  },
  {
    "id": "path-traversal.generic",
    "type": "PATH_TRAVERSAL",
    "provider": "fix-request-security",
    "name_zh": "路径遍历",
    "priority": 100,
    "supported_languages": [
      "java",
      "python",
      "javascript",
      "typescript",
      "csharp"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "path-traversal"
  },
  {
    "id": "zip-slip.generic",
    "type": "ZIP_SLIP",
    "provider": "fix-request-security",
    "name_zh": "Zip Slip",
    "priority": 100,
    "supported_languages": [
      "java",
      "python",
      "javascript",
      "typescript",
      "csharp"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "zip-slip"
  },
  {
    "id": "jndi-injection.generic",
    "type": "JNDI_INJECTION",
    "provider": "fix-injection",
    "name_zh": "JNDI 注入",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "jndi-injection"
  },
  {
    "id": "unsafe-reflection.generic",
    "type": "UNSAFE_REFLECTION",
    "provider": "fix-code-security",
    "name_zh": "不安全反射",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "unsafe-reflection"
  },
  {
    "id": "xss.generic",
    "type": "XSS",
    "provider": "fix-web-security",
    "name_zh": "跨站脚本（XSS）",
    "priority": 100,
    "supported_languages": [
      "java",
      "javascript",
      "typescript"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "xss"
  },
  {
    "id": "ssrf.generic",
    "type": "SSRF",
    "provider": "fix-request-security",
    "name_zh": "服务端请求伪造（SSRF）",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "ssrf"
  },
  {
    "id": "unsafe-file-upload.generic",
    "type": "UNSAFE_FILE_UPLOAD",
    "provider": "fix-request-security",
    "name_zh": "不安全文件上传",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "unsafe-file-upload"
  },
  {
    "id": "weak-crypto.generic",
    "type": "WEAK_CRYPTO",
    "provider": "fix-crypto-secret",
    "name_zh": "弱密码学",
    "priority": 100,
    "supported_languages": [
      "java",
      "python",
      "javascript",
      "typescript",
      "go",
      "c",
      "csharp",
      "php"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "weak-crypto"
  },
  {
    "id": "tls-trust-all.generic",
    "type": "TLS_TRUST_ALL",
    "provider": "fix-crypto-secret",
    "name_zh": "TLS 证书/主机名校验绕过",
    "priority": 100,
    "supported_languages": [
      "java",
      "python",
      "javascript",
      "typescript",
      "go",
      "csharp"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "tls-trust-all"
  },
  {
    "id": "cors-misconfiguration.generic",
    "type": "CORS_MISCONFIGURATION",
    "provider": "fix-web-security",
    "name_zh": "CORS_MISCONFIGURATION",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "spring-security",
      "spring-mvc",
      "express",
      "koa",
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "cors-misconfiguration"
  },
  {
    "id": "cookie-security.generic",
    "type": "COOKIE_SECURITY",
    "provider": "fix-auth-security",
    "name_zh": "Cookie 安全配置",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "spring-boot",
      "spring-security",
      "express",
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "cookie-security"
  },
  {
    "id": "hardcoded-secret.generic",
    "type": "HARDCODED_SECRET",
    "provider": "fix-crypto-secret",
    "name_zh": "硬编码 Secret",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "hardcoded-secret"
  },
  {
    "id": "sensitive-logging.generic",
    "type": "SENSITIVE_LOGGING",
    "provider": "fix-crypto-secret",
    "name_zh": "敏感信息日志泄露",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "sensitive-logging"
  },
  {
    "id": "redos.generic",
    "type": "REDOS",
    "provider": "fix-code-security",
    "name_zh": "正则表达式拒绝服务（ReDoS）",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "redos"
  },
  {
    "id": "csrf.generic",
    "type": "CSRF",
    "provider": "fix-web-security",
    "name_zh": "跨站请求伪造（CSRF）",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "spring-security",
      "spring-mvc",
      "django",
      "express",
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "csrf"
  },
  {
    "id": "mass-assignment.generic",
    "type": "MASS_ASSIGNMENT",
    "provider": "fix-auth-security",
    "name_zh": "Mass Assignment / Over-posting",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "mass-assignment"
  },
  {
    "id": "security-headers.generic",
    "type": "SECURITY_HEADERS",
    "provider": "fix-web-security",
    "name_zh": "安全响应头缺失/弱配置",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "security-headers"
  },
  {
    "id": "crlf-injection.generic",
    "type": "CRLF_INJECTION",
    "provider": "fix-web-security",
    "name_zh": "CRLF_INJECTION",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "crlf-injection"
  },
  {
    "id": "host-header-injection.generic",
    "type": "HOST_HEADER_INJECTION",
    "provider": "fix-web-security",
    "name_zh": "Host Header 注入",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "host-header-injection"
  },
  {
    "id": "jwt-security.generic",
    "type": "JWT_SECURITY",
    "provider": "fix-auth-security",
    "name_zh": "JWT 安全问题",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "spring-security",
      "java-jwt",
      "jjwt",
      "jsonwebtoken",
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "jwt-security"
  },
  {
    "id": "idor.generic",
    "type": "IDOR",
    "provider": "fix-auth-security",
    "name_zh": "IDOR",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "HUMAN_REVIEW",
    "validators": [
      "security-review"
    ],
    "strategy": "authorization"
  },
  {
    "id": "bola.generic",
    "type": "BOLA",
    "provider": "fix-auth-security",
    "name_zh": "BOLA",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "HUMAN_REVIEW",
    "validators": [
      "security-review"
    ],
    "strategy": "authorization"
  },
  {
    "id": "broken-function-level-authorization.generic",
    "type": "BROKEN_FUNCTION_LEVEL_AUTHORIZATION",
    "provider": "fix-auth-security",
    "name_zh": "BROKEN_FUNCTION_LEVEL_AUTHORIZATION",
    "priority": 100,
    "supported_languages": [
      "*"
    ],
    "supported_frameworks": [
      "*"
    ],
    "default_fixability": "HUMAN_REVIEW",
    "validators": [
      "security-review"
    ],
    "strategy": "authorization"
  },
  {
    "id": "dependency-vulnerability.generic",
    "type": "DEPENDENCY_VULNERABILITY",
    "provider": "fix-dependency-config",
    "name_zh": "第三方依赖漏洞",
    "priority": 100,
    "supported_languages": [
      "java",
      "python",
      "javascript",
      "typescript",
      "go",
      "csharp"
    ],
    "supported_frameworks": [
      "maven",
      "gradle",
      "npm",
      "pip",
      "nuget",
      "go-modules",
      "*"
    ],
    "default_fixability": "AUTO_FIX_WITH_REVIEW",
    "validators": [
      "security-review",
      "build",
      "test",
      "targeted-rescan",
      "regression-review"
    ],
    "strategy": "dependency-vulnerability"
  }
]

export function registerRepairEntry(entry: RepairEntry) {
  const index = entries.findIndex(item => item.id === entry.id)
  if (index >= 0) entries[index] = entry
  else entries.push(entry)
}

export function listRepairEntries() {
  return [...entries]
}

const languageAliases: Record<string, string> = {
  "c#": "csharp",
  "c-sharp": "csharp",
  ".net": "csharp",
  "dotnet": "csharp",
  "golang": "go",
  "js": "javascript",
  "jsx": "javascript",
  "node": "javascript",
  "node.js": "javascript",
  "nodejs": "javascript",
  "py": "python",
  "ts": "typescript",
  "tsx": "typescript",
}

const frameworkAliases: Record<string, string> = {
  "go-mod": "go-modules",
  "go.mod": "go-modules",
  "go modules": "go-modules",
  "node": "npm",
  "node.js": "npm",
  "pnpm": "npm",
  "pypi": "pip",
  "spring boot": "spring-boot",
  "spring mvc": "spring-mvc",
  "spring security": "spring-security",
  "yarn": "npm",
}

function normalize(value: string | undefined, aliases: Record<string, string>) {
  const normalized = value?.trim().toLowerCase()
  return normalized ? aliases[normalized] ?? normalized.replace(/_/g, "-") : undefined
}

function supports(values: string[], actual: string | undefined) {
  if (!actual) return true
  const normalized = values.map(value => value.toLowerCase())
  return normalized.includes("*") || normalized.includes(actual)
}

function exact(values: string[], actual: string | undefined) {
  if (!actual) return 0
  return values.some(value => value.toLowerCase() === actual) ? 1 : 0
}

export function resolveRepairEntry(type: string, language?: string, framework?: string) {
  const targetType = type.trim().toUpperCase()
  const targetLanguage = normalize(language, languageAliases)
  const targetFramework = normalize(framework, frameworkAliases)

  const candidates = entries
    .filter(entry => entry.type.toUpperCase() === targetType)
    .filter(entry => supports(entry.supported_languages, targetLanguage))
    .filter(entry => supports(entry.supported_frameworks, targetFramework))
    .map(entry => ({
      entry,
      specificity:
        exact(entry.supported_languages, targetLanguage) +
        exact(entry.supported_frameworks, targetFramework),
    }))
    .sort((a, b) =>
      b.specificity - a.specificity || b.entry.priority - a.entry.priority,
    )

  return candidates[0]?.entry
}
