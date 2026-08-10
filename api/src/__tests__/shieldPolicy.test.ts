import { describe, it, expect } from 'vitest';
import {
  compileToolPattern,
  patternMatches,
  evaluatePolicies,
  validatePolicyInput,
  type ShieldPolicy,
} from '../lib/shieldPolicy.js';

const policy = (overrides: Partial<ShieldPolicy>): ShieldPolicy => ({
  id: 'p1',
  name: 'test',
  tool_pattern: '*',
  action: 'REQUIRE_APPROVAL',
  priority: 100,
  timeout_seconds: 300,
  enabled: true,
  ...overrides,
});

describe('compileToolPattern', () => {
  it('matches exact tool names', () => {
    expect(patternMatches('send_email', 'send_email')).toBe(true);
    expect(patternMatches('send_email', 'send_emails')).toBe(false);
  });

  it('supports * globs anywhere in the pattern', () => {
    expect(patternMatches('stripe_*', 'stripe_refund')).toBe(true);
    expect(patternMatches('stripe_*', 'stripe_')).toBe(true);
    expect(patternMatches('stripe_*', 'paypal_refund')).toBe(false);
    expect(patternMatches('*_delete', 'user_delete')).toBe(true);
    expect(patternMatches('*_delete', 'delete_user')).toBe(false);
    expect(patternMatches('*', 'anything')).toBe(true);
  });

  it('supports ? for a single character', () => {
    expect(patternMatches('tool_?', 'tool_a')).toBe(true);
    expect(patternMatches('tool_?', 'tool_ab')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(patternMatches('Stripe_*', 'stripe_refund')).toBe(true);
  });

  it('escapes regex specials so patterns stay literal', () => {
    expect(patternMatches('a.b', 'a.b')).toBe(true);
    expect(patternMatches('a.b', 'axb')).toBe(false); // "." must not act as regex dot
    expect(patternMatches('fn(x)', 'fn(x)')).toBe(true);
    expect(compileToolPattern('a+b').test('a+b')).toBe(true);
  });
});

describe('evaluatePolicies', () => {
  it('returns default ALLOW with no policies', () => {
    expect(evaluatePolicies([], 'anything')).toEqual({ action: 'ALLOW', policy: null });
  });

  it('picks the first matching policy by priority', () => {
    const policies = [
      policy({ id: 'low', tool_pattern: 'stripe_*', action: 'BLOCK', priority: 200 }),
      policy({ id: 'high', tool_pattern: 'stripe_refund', action: 'REQUIRE_APPROVAL', priority: 10 }),
    ];
    const verdict = evaluatePolicies(policies, 'stripe_refund');
    expect(verdict.action).toBe('REQUIRE_APPROVAL');
    expect(verdict.policy?.id).toBe('high');
  });

  it('falls through to broader patterns when the specific one does not match', () => {
    const policies = [
      policy({ id: 'specific', tool_pattern: 'stripe_refund', action: 'ALLOW', priority: 10 }),
      policy({ id: 'broad', tool_pattern: 'stripe_*', action: 'BLOCK', priority: 20 }),
    ];
    expect(evaluatePolicies(policies, 'stripe_payout').policy?.id).toBe('broad');
  });

  it('skips disabled policies', () => {
    const policies = [
      policy({ id: 'off', tool_pattern: '*', action: 'BLOCK', priority: 1, enabled: false }),
    ];
    expect(evaluatePolicies(policies, 'anything')).toEqual({ action: 'ALLOW', policy: null });
  });

  it('breaks priority ties by creation order', () => {
    const policies = [
      policy({ id: 'newer', tool_pattern: '*', action: 'BLOCK', priority: 50, created_at: '2026-02-01' }),
      policy({ id: 'older', tool_pattern: '*', action: 'ALLOW', priority: 50, created_at: '2026-01-01' }),
    ];
    expect(evaluatePolicies(policies, 'x').policy?.id).toBe('older');
  });
});

describe('validatePolicyInput', () => {
  it('accepts a minimal valid payload', () => {
    expect(validatePolicyInput({ name: 'p', tool_pattern: 'x_*' })).toBeNull();
  });

  it('rejects missing name or pattern', () => {
    expect(validatePolicyInput({ tool_pattern: 'x' })).toMatch(/name/);
    expect(validatePolicyInput({ name: 'p' })).toMatch(/tool_pattern/);
  });

  it('rejects unknown actions and bad timeouts', () => {
    expect(validatePolicyInput({ name: 'p', tool_pattern: 'x', action: 'MAYBE' })).toMatch(/action/);
    expect(validatePolicyInput({ name: 'p', tool_pattern: 'x', timeout_seconds: 5 })).toMatch(/timeout/);
    expect(validatePolicyInput({ name: 'p', tool_pattern: 'x', timeout_seconds: 100000 })).toMatch(/timeout/);
  });
});
