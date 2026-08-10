/**
 * Shield Policy Engine — pure evaluation logic (no I/O).
 *
 * Policies match tool names by glob pattern:
 *   `*` matches any run of characters, `?` matches exactly one.
 *   Matching is case-insensitive and anchored (whole-name match).
 *
 * Resolution: enabled policies only, ordered by priority ASC then
 * created_at ASC — the first pattern that matches decides the verdict.
 * No match → default ALLOW (fail-open by design: Shield must degrade
 * gracefully for orgs that never configured policies).
 */

export type ShieldAction = 'ALLOW' | 'REQUIRE_APPROVAL' | 'BLOCK';

// Number of BLOCK verdicts (per agent, rolling 1h window) that trips the
// circuit "open". Single source of truth for compliance.ts and shield.ts;
// kept in sync with the SQL threshold in migration 016.
export const CIRCUIT_BREAKER_BLOCK_THRESHOLD = 5;

export interface ShieldPolicy {
  id: string;
  name: string;
  tool_pattern: string;
  action: ShieldAction;
  priority: number;
  timeout_seconds: number;
  enabled: boolean;
  created_at?: string;
}

export interface PolicyVerdict {
  action: ShieldAction;
  policy: ShieldPolicy | null; // null = default ALLOW (no match)
}

/** Compile a glob tool pattern into an anchored, case-insensitive RegExp. */
export function compileToolPattern(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex specials except * and ?
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

/** True when the pattern matches the tool name. Invalid patterns never match. */
export function patternMatches(pattern: string, toolName: string): boolean {
  try {
    return compileToolPattern(pattern).test(toolName);
  } catch {
    return false;
  }
}

/** Evaluate policies against a tool name; first match by priority wins. */
export function evaluatePolicies(policies: ShieldPolicy[], toolName: string): PolicyVerdict {
  const ordered = policies
    .filter(p => p.enabled)
    .sort((a, b) =>
      a.priority - b.priority ||
      String(a.created_at || '').localeCompare(String(b.created_at || ''))
    );
  for (const policy of ordered) {
    if (patternMatches(policy.tool_pattern, toolName)) {
      return { action: policy.action, policy };
    }
  }
  return { action: 'ALLOW', policy: null };
}

/** Validate a policy payload from the API. Returns an error message or null. */
export function validatePolicyInput(body: Record<string, unknown>): string | null {
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return 'name is required';
  }
  if (!body.tool_pattern || typeof body.tool_pattern !== 'string' || !body.tool_pattern.trim()) {
    return 'tool_pattern is required';
  }
  if (body.action !== undefined &&
      !['ALLOW', 'REQUIRE_APPROVAL', 'BLOCK'].includes(body.action as string)) {
    return 'action must be ALLOW, REQUIRE_APPROVAL, or BLOCK';
  }
  if (body.priority !== undefined &&
      (!Number.isInteger(body.priority) || (body.priority as number) < 0)) {
    return 'priority must be a non-negative integer';
  }
  if (body.timeout_seconds !== undefined) {
    const t = body.timeout_seconds as number;
    if (!Number.isInteger(t) || t < 10 || t > 86400) {
      return 'timeout_seconds must be an integer between 10 and 86400';
    }
  }
  return null;
}
