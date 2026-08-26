export type Fixability =
  | "AUTO_FIX"
  | "AUTO_FIX_WITH_REVIEW"
  | "HUMAN_REVIEW"
  | "GUIDANCE_ONLY"
  | "NOT_SUPPORTED"

export interface RepairEntry {
  id: string
  display_type: string
  matchers?: {
    scanner_rules?: Array<{ scanner: string; rule_id: string }>
    taxonomies?: Array<{ name: string; id: string }>
    aliases?: string[]
  }
  provider: string
  strategy: string
  name_zh?: string
  priority: number
  supported_languages: string[]
  supported_frameworks: string[]
  default_fixability: Fixability
  validators: string[]
}

const builtinCwes: Record<string, string[]> = {
  SQL_INJECTION: ["CWE-89"],
  NOSQL_INJECTION: ["CWE-943"],
  COMMAND_INJECTION: ["CWE-78"],
  TEMPLATE_INJECTION: ["CWE-1336"],
  EXPRESSION_INJECTION: ["CWE-917"],
  XXE: ["CWE-611"],
  XPATH_INJECTION: ["CWE-643"],
  LDAP_INJECTION: ["CWE-90"],
  XML_INJECTION: ["CWE-91"],
  DDE_INJECTION: ["CWE-1236"],
  UNSAFE_DESERIALIZATION: ["CWE-502"],
  OPEN_REDIRECT: ["CWE-601"],
  PATH_TRAVERSAL: ["CWE-22"],
  ZIP_SLIP: ["CWE-22"],
  UNSAFE_REFLECTION: ["CWE-470"],
  XSS: ["CWE-79"],
  SSRF: ["CWE-918"],
  UNSAFE_FILE_UPLOAD: ["CWE-434"],
  WEAK_CRYPTO: ["CWE-327"],
  TLS_TRUST_ALL: ["CWE-295"],
  CORS_MISCONFIGURATION: ["CWE-942"],
  COOKIE_SECURITY: ["CWE-614", "CWE-1004"],
  HARDCODED_SECRET: ["CWE-259", "CWE-321", "CWE-798"],
  SENSITIVE_LOGGING: ["CWE-532"],
  REDOS: ["CWE-1333"],
  CSRF: ["CWE-352"],
  MASS_ASSIGNMENT: ["CWE-915"],
  SECURITY_HEADERS: ["CWE-693"],
  CRLF_INJECTION: ["CWE-93"],
  HOST_HEADER_INJECTION: ["CWE-346", "CWE-644"],
  IDOR: ["CWE-639"],
  BOLA: ["CWE-639"],
  BROKEN_FUNCTION_LEVEL_AUTHORIZATION: ["CWE-862"],
  DEPENDENCY_VULNERABILITY: ["CWE-1104"],
}

const builtinAliases: Record<string, string[]> = {
  SQL_INJECTION: ["SQLI"],
  COMMAND_INJECTION: ["OS_COMMAND_INJECTION", "SHELL_INJECTION"],
  TEMPLATE_INJECTION: ["SSTI", "SERVER_SIDE_TEMPLATE_INJECTION"],
  UNSAFE_DESERIALIZATION: ["INSECURE_DESERIALIZATION", "DESERIALIZATION"],
  PATH_TRAVERSAL: ["DIRECTORY_TRAVERSAL"],
  XSS: ["CROSS_SITE_SCRIPTING"],
  SSRF: ["SERVER_SIDE_REQUEST_FORGERY"],
  UNSAFE_FILE_UPLOAD: ["UNRESTRICTED_FILE_UPLOAD"],
  WEAK_CRYPTO: ["WEAK_CRYPTOGRAPHY", "BROKEN_CRYPTOGRAPHY"],
  TLS_TRUST_ALL: ["IMPROPER_CERTIFICATE_VALIDATION"],
  HARDCODED_SECRET: ["HARDCODED_CREDENTIALS", "HARDCODED_PASSWORD"],
  REDOS: ["REGULAR_EXPRESSION_DENIAL_OF_SERVICE"],
  BOLA: ["BROKEN_OBJECT_LEVEL_AUTHORIZATION"],
  BROKEN_FUNCTION_LEVEL_AUTHORIZATION: ["BFLA"],
  DEPENDENCY_VULNERABILITY: ["VULNERABLE_DEPENDENCY", "KNOWN_VULNERABLE_COMPONENT"],
}

const builtinScannerRules: Record<string, Array<{ scanner: string; rule_id: string }>> = {
  SQL_INJECTION: [
    { scanner: "CodeQL", rule_id: "java/sql-injection" },
    { scanner: "CodeQL", rule_id: "js/sql-injection" },
    { scanner: "CodeQL", rule_id: "py/sql-injection" },
  ],
}

function withDefaultMatchers(entry: RepairEntry): RepairEntry {
  const existing = entry.matchers ?? {}
  const taxonomies = (builtinCwes[entry.display_type] ?? []).map(id => ({ name: "CWE", id }))
  return {
    ...entry,
    matchers: {
      scanner_rules: [
        ...(builtinScannerRules[entry.display_type] ?? []),
        ...(existing.scanner_rules ?? []),
      ],
      taxonomies: [...taxonomies, ...(existing.taxonomies ?? [])],
      aliases: [entry.display_type, ...(builtinAliases[entry.display_type] ?? []), ...(existing.aliases ?? [])],
    },
  }
}

const entries: RepairEntry[] = [
  {
    "id": "sql-injection.generic",
    "display_type": "SQL_INJECTION",
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
    "display_type": "NOSQL_INJECTION",
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
    "display_type": "COMMAND_INJECTION",
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
    "display_type": "TEMPLATE_INJECTION",
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
    "display_type": "EXPRESSION_INJECTION",
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
    "display_type": "XXE",
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
    "display_type": "XPATH_INJECTION",
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
    "display_type": "LDAP_INJECTION",
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
    "display_type": "XML_INJECTION",
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
    "display_type": "DDE_INJECTION",
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
    "display_type": "UNSAFE_DESERIALIZATION",
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
    "display_type": "OPEN_REDIRECT",
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
    "display_type": "PATH_TRAVERSAL",
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
    "display_type": "ZIP_SLIP",
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
    "display_type": "JNDI_INJECTION",
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
    "display_type": "UNSAFE_REFLECTION",
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
    "display_type": "XSS",
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
    "display_type": "SSRF",
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
    "display_type": "UNSAFE_FILE_UPLOAD",
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
    "display_type": "WEAK_CRYPTO",
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
    "display_type": "TLS_TRUST_ALL",
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
    "display_type": "CORS_MISCONFIGURATION",
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
    "display_type": "COOKIE_SECURITY",
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
    "display_type": "HARDCODED_SECRET",
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
    "display_type": "SENSITIVE_LOGGING",
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
    "display_type": "REDOS",
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
    "display_type": "CSRF",
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
    "display_type": "MASS_ASSIGNMENT",
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
    "display_type": "SECURITY_HEADERS",
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
    "display_type": "CRLF_INJECTION",
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
    "display_type": "HOST_HEADER_INJECTION",
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
    "display_type": "JWT_SECURITY",
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
    "display_type": "IDOR",
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
    "display_type": "BOLA",
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
    "display_type": "BROKEN_FUNCTION_LEVEL_AUTHORIZATION",
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
    "display_type": "DEPENDENCY_VULNERABILITY",
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
].map(withDefaultMatchers)

export function registerRepairEntry(entry: RepairEntry) {
  const normalized = withDefaultMatchers(entry)
  const index = entries.findIndex(item => item.id === entry.id)
  if (index >= 0) entries[index] = normalized
  else entries.push(normalized)
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

export function getRepairEntry(id: string) {
  const targetId = id.trim()
  return entries.find(entry => entry.id === targetId)
}

export function resolveRepairEntryById(id: string, language?: string, framework?: string) {
  const targetLanguage = normalize(language, languageAliases)
  const targetFramework = normalize(framework, frameworkAliases)
  const entry = getRepairEntry(id)
  if (!entry) return undefined
  if (!supports(entry.supported_languages, targetLanguage)) return undefined
  if (!supports(entry.supported_frameworks, targetFramework)) return undefined
  return entry
}
