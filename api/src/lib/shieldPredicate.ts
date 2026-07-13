/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Active Shield Layer 2: Predicate Rules
 * ═══════════════════════════════════════════════════════
 *  Sandboxed CEL (Common Expression Language) evaluation via
 *  cel-js — a pure-JS interpreter with no host access: no eval,
 *  no imports, no I/O, just expressions over the provided context.
 *
 *  Predicates express what JSON Schema cannot, e.g.
 *    args.amount_cents <= budget_remaining
 *    args.env in ["dev", "staging"]
 *  A predicate that evaluates to anything other than boolean true
 *  is a violation; evaluation errors are violations too (fail closed
 *  on a broken rule — a governance rule that can't run must not pass).
 */

import { evaluate, parse } from 'cel-js';
import type { SchemaViolation } from './shieldPolicy.js';

/** Context exposed to CEL predicates on /shield/evaluate */
export interface PredicateContext {
  args: Record<string, unknown>;
  agent_id: string | null;
  trace_id: string | null;
  /** limit_cents - spent_cents for the policy's budget key; 0 when no budget row exists */
  budget_remaining: number;
}

/**
 * Validate a CEL expression at policy-write time.
 * Returns null when the expression parses, else a human-readable error —
 * POST /shield/policies surfaces it as a 400, mirroring compilePolicySchema.
 */
export function validatePredicateSyntax(expression: string): string | null {
  try {
    const result = parse(expression);
    if (!result.isSuccess) {
      return 'Invalid CEL predicate: expression does not parse';
    }
    return null;
  } catch (err: unknown) {
    return `Invalid CEL predicate: ${(err as Error).message || 'parse failed'}`;
  }
}

/**
 * True only when the predicate references budget_remaining, so the
 * evaluate route can skip the budgets lookup for budget-free predicates.
 * (Cheap token containment check — the authoritative evaluation is CEL.)
 */
export function predicateUsesBudget(expression: string): boolean {
  return expression.includes('budget_remaining');
}

/**
 * Evaluate a CEL predicate against the shield context.
 * Result contract mirrors validateToolArgs: { valid, errors[] }.
 *  - strict boolean true  → pass
 *  - false / non-boolean  → violation (keyword: predicate_failed)
 *  - parse/type/eval error → violation (keyword: predicate_error)
 */
export function evaluatePredicate(
  expression: string,
  context: PredicateContext,
): { valid: boolean; errors: SchemaViolation[] } {
  let result: unknown;
  try {
    result = evaluate(expression, context as unknown as Record<string, unknown>);
  } catch (err: unknown) {
    return {
      valid: false,
      errors: [{
        path: '/predicate',
        message: `predicate evaluation failed: ${(err as Error).message || 'unknown error'}`.slice(0, 300),
        keyword: 'predicate_error',
      }],
    };
  }
  if (result === true) return { valid: true, errors: [] };
  return {
    valid: false,
    errors: [{
      path: '/predicate',
      message: result === false
        ? `predicate '${expression.slice(0, 200)}' evaluated to false`
        : `predicate must evaluate to a boolean, got ${typeof result}`,
      keyword: 'predicate_failed',
    }],
  };
}
