/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Active Shield Layer 3: Semantic Validators
 * ═══════════════════════════════════════════════════════
 *  Regex denylists are trivially bypassable (comment-splitting the SQL
 *  keyword, "$IFS" in shell, url userinfo tricks). For args flagged as
 *  dangerous types we PARSE the value with a real parser and allowlist:
 *
 *    sql   → pgsql-parser (the actual PostgreSQL grammar via wasm)
 *    shell → shell-quote word/operator parser
 *    url   → WHATWG URL API
 *
 *  Convention — a policy's JSON Schema property may carry:
 *    x-validator:        "sql" | "shell" | "url"
 *    x-allow-statements: string[]  (sql; default ["SELECT"])
 *    x-allow-tables:     string[]  (sql; omit to skip the table check)
 *    x-allow-binaries:   string[]  (shell; omit to skip the binary check)
 *    x-allow-domains:    string[]  (url; omit to skip the domain check)
 *    x-allow-protocols:  string[]  (url; default ["https", "http"])
 *
 *  A parse failure is ALWAYS a rejection: input the real parser cannot
 *  understand is input we cannot reason about. Violations flow through
 *  the policy's enforcement mode exactly like schema violations.
 */

import { parse as pgParse } from 'pgsql-parser';
import { parse as shellParse } from 'shell-quote';
import type { SchemaViolation } from './shieldPolicy.js';

export type SemanticValidatorType = 'sql' | 'shell' | 'url';

const VALIDATOR_TYPES: readonly string[] = ['sql', 'shell', 'url'];

/** Per-property validator config lifted from x-* schema keywords */
interface ValidatorConfig {
  type: SemanticValidatorType;
  allowStatements?: string[];
  allowTables?: string[];
  allowBinaries?: string[];
  allowDomains?: string[];
  allowProtocols?: string[];
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is string => typeof v === 'string');
}

// ─────────────────────────────────────────────
//  SQL — pgsql-parser (real PostgreSQL grammar)
// ─────────────────────────────────────────────

/** Recursively collect RangeVar relnames + CTE names from a parse tree */
function walkSqlNode(node: unknown, tables: Set<string>, ctes: Set<string>): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) walkSqlNode(item, tables, ctes);
    return;
  }
  const obj = node as Record<string, unknown>;
  const rangeVar = obj.RangeVar as Record<string, unknown> | undefined;
  if (rangeVar && typeof rangeVar.relname === 'string') {
    tables.add(rangeVar.relname.toLowerCase());
  }
  const cte = obj.CommonTableExpr as Record<string, unknown> | undefined;
  if (cte && typeof cte.ctename === 'string') {
    ctes.add(cte.ctename.toLowerCase());
  }
  for (const value of Object.values(obj)) walkSqlNode(value, tables, ctes);
}

/** SelectStmt → SELECT, DropStmt → DROP, AlterTableStmt → ALTERTABLE, … */
function statementTypeName(nodeKey: string): string {
  return nodeKey.replace(/Stmt$/, '').toUpperCase();
}

export async function validateSqlArg(
  path: string,
  sql: string,
  config: ValidatorConfig,
): Promise<SchemaViolation[]> {
  let parsed: { stmts?: Array<{ stmt?: Record<string, unknown> }> };
  try {
    parsed = await pgParse(sql) as typeof parsed;
  } catch (err: unknown) {
    // Parse failure = reject. Unparseable input cannot be reasoned about.
    return [{ path, message: `SQL failed to parse: ${(err as Error).message || 'syntax error'}`.slice(0, 300), keyword: 'sql_parse_error' }];
  }

  const stmts = parsed.stmts || [];
  if (stmts.length === 0) {
    return [{ path, message: 'SQL contains no statements', keyword: 'sql_empty' }];
  }
  if (stmts.length > 1) {
    // Multi-statement is the classic injection vector ("SELECT 1; DROP TABLE x")
    return [{ path, message: `SQL contains ${stmts.length} statements; only a single statement is allowed`, keyword: 'sql_multi_statement' }];
  }

  const stmtNode = stmts[0].stmt || {};
  const nodeKey = Object.keys(stmtNode)[0] || 'Unknown';
  let stmtType = statementTypeName(nodeKey);
  // SELECT … INTO creates a table — treat it as CREATE, not SELECT
  const selectStmt = stmtNode.SelectStmt as Record<string, unknown> | undefined;
  if (stmtType === 'SELECT' && selectStmt && selectStmt.intoClause) {
    stmtType = 'CREATE';
  }

  const violations: SchemaViolation[] = [];
  // Statement-type allowlist — default SELECT-only. DDL/DML rejected unless listed.
  const allowedStatements = (config.allowStatements && config.allowStatements.length > 0
    ? config.allowStatements : ['SELECT']).map((s) => s.toUpperCase());
  if (!allowedStatements.includes(stmtType)) {
    violations.push({ path, message: `SQL statement type ${stmtType} is not allowed (allowed: ${allowedStatements.join(', ')})`, keyword: 'sql_statement_denied' });
  }

  // Table allowlist — every referenced relation must be listed (CTE names are
  // query-local aliases, not relations, so they are implicitly permitted).
  if (config.allowTables) {
    const tables = new Set<string>();
    const ctes = new Set<string>();
    walkSqlNode(stmtNode, tables, ctes);
    const allowed = new Set(config.allowTables.map((t) => t.toLowerCase()));
    for (const table of tables) {
      if (!ctes.has(table) && !allowed.has(table)) {
        violations.push({ path, message: `SQL references table '${table}' which is not in the allowlist`, keyword: 'sql_table_denied' });
      }
    }
  }
  return violations;
}

// ─────────────────────────────────────────────
//  Shell — shell-quote word/operator parser
// ─────────────────────────────────────────────

export function validateShellArg(
  path: string,
  command: string,
  config: ValidatorConfig,
): SchemaViolation[] {
  let sawSubstitution = false;
  let entries: ReturnType<typeof shellParse>;
  try {
    // env callback: shell-quote invokes it for every $VAR / ${VAR} expansion —
    // parser-level detection of environment substitution, no regex involved.
    entries = shellParse(command, () => { sawSubstitution = true; return ''; });
  } catch (err: unknown) {
    return [{ path, message: `shell command failed to parse: ${(err as Error).message || 'parse error'}`.slice(0, 300), keyword: 'shell_parse_error' }];
  }

  if (sawSubstitution) {
    return [{ path, message: 'shell command uses environment variable substitution ($VAR), which is not allowed', keyword: 'shell_substitution' }];
  }
  if (entries.length === 0) {
    return [{ path, message: 'shell command is empty', keyword: 'shell_empty' }];
  }

  for (const entry of entries) {
    if (typeof entry === 'string') {
      // Backticks survive tokenization as literal characters — command substitution
      if (entry.includes('`')) {
        return [{ path, message: 'shell command uses backtick command substitution, which is not allowed', keyword: 'shell_substitution' }];
      }
      continue;
    }
    // Non-string tokens are operators/comments. Globs are pure filename
    // expansion (no chaining) and stay allowed; everything else — ; && || |
    // & > < $( ) — chains commands or redirects I/O and is rejected.
    const op = (entry as { op?: string }).op;
    if (op === 'glob') continue;
    return [{ path, message: `shell command contains operator '${op ?? 'comment'}' — chaining/redirection is not allowed`, keyword: 'shell_operator' }];
  }

  const binary = entries[0];
  if (typeof binary !== 'string') {
    return [{ path, message: 'shell command must start with a plain binary name', keyword: 'shell_binary_denied' }];
  }
  // Binary allowlist — EXACT match ('ls' does not authorize '/sbin/ls';
  // list full paths explicitly if you want them).
  if (config.allowBinaries && !config.allowBinaries.includes(binary)) {
    return [{ path, message: `shell binary '${binary}' is not in the allowlist`, keyword: 'shell_binary_denied' }];
  }
  return [];
}

// ─────────────────────────────────────────────
//  URL — WHATWG URL API
// ─────────────────────────────────────────────

export function validateUrlArg(
  path: string,
  value: string,
  config: ValidatorConfig,
): SchemaViolation[] {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return [{ path, message: `value is not a parseable absolute URL`, keyword: 'url_parse_error' }];
  }

  const violations: SchemaViolation[] = [];
  const allowedProtocols = (config.allowProtocols && config.allowProtocols.length > 0
    ? config.allowProtocols : ['https', 'http'])
    .map((p) => (p.endsWith(':') ? p : `${p}:`).toLowerCase());
  if (!allowedProtocols.includes(url.protocol)) {
    violations.push({ path, message: `URL protocol '${url.protocol}' is not allowed (allowed: ${allowedProtocols.join(', ')})`, keyword: 'url_protocol_denied' });
  }

  if (config.allowDomains) {
    const hostname = url.hostname.toLowerCase();
    const permitted = config.allowDomains.some((d) => {
      const domain = d.toLowerCase();
      return hostname === domain || hostname.endsWith(`.${domain}`);
    });
    if (!permitted) {
      violations.push({ path, message: `URL host '${hostname}' is not in the allowlist`, keyword: 'url_domain_denied' });
    }
  }
  return violations;
}

// ─────────────────────────────────────────────
//  Orchestrator — walk top-level schema properties
// ─────────────────────────────────────────────

function extractConfig(prop: Record<string, unknown>): ValidatorConfig | null {
  const type = prop['x-validator'];
  if (typeof type !== 'string' || !VALIDATOR_TYPES.includes(type)) return null;
  return {
    type: type as SemanticValidatorType,
    allowStatements: asStringArray(prop['x-allow-statements']),
    allowTables: asStringArray(prop['x-allow-tables']),
    allowBinaries: asStringArray(prop['x-allow-binaries']),
    allowDomains: asStringArray(prop['x-allow-domains']),
    allowProtocols: asStringArray(prop['x-allow-protocols']),
  };
}

/**
 * Run every x-validator declared on the policy schema's TOP-LEVEL properties
 * against the matching args. Non-string / absent args are skipped — presence
 * and type belong to Layer 1 (JSON Schema required/type keywords).
 * Returns all violations; [] = pass.
 */
export async function runSemanticValidators(
  schema: unknown,
  args: Record<string, unknown>,
): Promise<SchemaViolation[]> {
  if (schema === null || typeof schema !== 'object') return [];
  const properties = (schema as Record<string, unknown>).properties;
  if (properties === null || typeof properties !== 'object') return [];

  const violations: SchemaViolation[] = [];
  for (const [name, rawProp] of Object.entries(properties as Record<string, unknown>)) {
    if (rawProp === null || typeof rawProp !== 'object') continue;
    const config = extractConfig(rawProp as Record<string, unknown>);
    if (!config) continue;
    const value = args[name];
    if (typeof value !== 'string') continue;

    const path = `/${name}`;
    if (config.type === 'sql') {
      violations.push(...await validateSqlArg(path, value, config));
    } else if (config.type === 'shell') {
      violations.push(...validateShellArg(path, value, config));
    } else {
      violations.push(...validateUrlArg(path, value, config));
    }
  }
  return violations;
}
