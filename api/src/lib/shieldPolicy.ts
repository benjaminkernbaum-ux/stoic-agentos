/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Active Shield Layer 1: Schema Policies
 * ═══════════════════════════════════════════════════════
 *  Ajv (JSON Schema draft-07) compilation + validation for
 *  tool_policies. Compiled validators are memoized in a small
 *  LRU cache keyed by policy id + updated_at, so the hot path
 *  (/compliance/shield/evaluate) skips recompilation until a
 *  policy actually changes.
 */

import { Ajv } from 'ajv';
import type { ValidateFunction, ErrorObject } from 'ajv';

/** Graduated enforcement modes for a schema violation */
export const ENFORCEMENT_MODES = ['block', 'require_approval', 'monitor'] as const;
export type EnforcementMode = (typeof ENFORCEMENT_MODES)[number];

export function isEnforcementMode(value: unknown): value is EnforcementMode {
  return typeof value === 'string' && (ENFORCEMENT_MODES as readonly string[]).includes(value);
}

/** Normalized validation error returned to callers and written to audit_log metadata */
export interface SchemaViolation {
  path: string;
  message: string;
  keyword: string;
}

// Single Ajv instance — allErrors so agents see every violation at once;
// strict:false tolerates vendor extensions (e.g. x-* keywords) in user schemas
// while still rejecting structurally invalid schemas at compile time.
const ajv = new Ajv({ allErrors: true, strict: false });

// ── LRU cache of compiled validators ──
// Key: `${policy.id}:${policy.updated_at}` — updated_at in the key means a
// policy edit naturally invalidates its stale entry (which then ages out).
const MAX_CACHE_ENTRIES = 500;
const validatorCache = new Map<string, ValidateFunction>();

function cacheGet(key: string): ValidateFunction | undefined {
  const hit = validatorCache.get(key);
  if (hit) {
    // Refresh recency (Map preserves insertion order)
    validatorCache.delete(key);
    validatorCache.set(key, hit);
  }
  return hit;
}

function cacheSet(key: string, validate: ValidateFunction): void {
  if (validatorCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = validatorCache.keys().next().value;
    if (oldest !== undefined) validatorCache.delete(oldest);
  }
  validatorCache.set(key, validate);
}

/** Test-only escape hatch */
export function clearValidatorCache(): void {
  validatorCache.clear();
}

/**
 * Compile a JSON Schema, optionally memoized under cacheKey.
 * Throws Error('Invalid JSON Schema: …') if the schema itself doesn't compile —
 * callers (POST /shield/policies) surface this as a 400.
 */
export function compilePolicySchema(schema: unknown, cacheKey?: string): ValidateFunction {
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new Error('Invalid JSON Schema: schema must be a JSON object');
  }
  if (cacheKey) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
  }
  let validate: ValidateFunction;
  try {
    validate = ajv.compile(schema as Record<string, unknown>);
  } catch (err: unknown) {
    throw new Error(`Invalid JSON Schema: ${(err as Error).message || 'compile failed'}`);
  }
  if (cacheKey) cacheSet(cacheKey, validate);
  return validate;
}

/** Flatten Ajv's ErrorObject[] into a stable, serializable shape */
export function formatSchemaViolations(errors: ErrorObject[] | null | undefined): SchemaViolation[] {
  return (errors || []).map((e) => ({
    path: e.instancePath || '/',
    message: e.message || 'violates schema',
    keyword: e.keyword,
  }));
}

/**
 * Validate tool args against a policy schema.
 * A schema that fails to compile (corrupt row written outside the API) is
 * reported as a violation rather than thrown — the evaluate endpoint then
 * applies the policy's enforcement mode to it.
 */
export function validateToolArgs(
  schema: unknown,
  args: unknown,
  cacheKey?: string,
): { valid: boolean; errors: SchemaViolation[] } {
  let validate: ValidateFunction;
  try {
    validate = compilePolicySchema(schema, cacheKey);
  } catch (err: unknown) {
    return {
      valid: false,
      errors: [{ path: '/', message: (err as Error).message, keyword: 'schema_compile_error' }],
    };
  }
  const valid = validate(args) as boolean;
  return { valid, errors: valid ? [] : formatSchemaViolations(validate.errors) };
}
