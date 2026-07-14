/**
 * ═══════════════════════════════════════════════════════
 *  Active Shield Layer 1 — Schema Policy Engine tests
 * ═══════════════════════════════════════════════════════
 *  Exercises the real compliance router over HTTP (express on an
 *  ephemeral port) with Supabase mocked, following the module-mock
 *  style of src/lib/anthropic.test.ts.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

// ── Supabase mock: chainable, thenable query builder ──
// Each `from(table)` call pops the next queued result for that table
// (default: { data: null, error: null }) and records the chain so tests
// can assert on insert/upsert payloads.
const queued: Record<string, Array<{ data: unknown; error: unknown }>> = {};
const chains: Record<string, any[]> = {};

function makeChain(result: { data: unknown; error: unknown }) {
  const c: any = {};
  for (const m of ['select', 'eq', 'order', 'limit', 'insert', 'upsert', 'update', 'delete', 'maybeSingle', 'single', 'gte', 'lte']) {
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

vi.mock('./../middleware/db.js', () => ({
  supabase: { from: (table: string) => fromMock(table), rpc: vi.fn() },
}));

// Authenticate as an org member with admin rights; real rbac middleware runs.
vi.mock('./../middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.org = { id: 'org-1', plan: 'pro' };
    req.user = { id: 'user-1', email: 'admin@test.dev' };
    req.role = 'owner';
    next();
  },
}));

// ── Fixtures ──
const CMD_SCHEMA = {
  type: 'object',
  properties: { cmd: { type: 'string', maxLength: 20 } },
  required: ['cmd'],
  additionalProperties: false,
};

function policyRow(enforcement: string) {
  return {
    id: 'pol-1',
    org_id: 'org-1',
    tool_name: 'run_command',
    schema: CMD_SCHEMA,
    enforcement,
    active: true,
    created_at: '2026-07-13T00:00:00Z',
    updated_at: `2026-07-13T00:00:00Z#${enforcement}`, // distinct validator cache key per fixture
  };
}

const TABLE_MISSING = { code: '42P01', message: 'relation "tool_policies" does not exist' };

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
  for (const k of Object.keys(queued)) delete queued[k];
  for (const k of Object.keys(chains)) delete chains[k];
  const { clearValidatorCache } = await import('./../lib/shieldPolicy.js');
  clearValidatorCache();
});

// ═══════════════════════════════════════════════════════
//  POST /shield/evaluate — graduated verdicts
// ═══════════════════════════════════════════════════════

describe('POST /api/v1/compliance/shield/evaluate', () => {
  it('returns 400 when tool_name is missing', async () => {
    const res = await post('/api/v1/compliance/shield/evaluate', { tool_args: {} });
    expect(res.status).toBe(400);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('ALLOWs with reason no_policy when no policy exists for the tool (and skips audit)', async () => {
    queued.tool_policies = [{ data: null, error: null }];
    const res = await post('/api/v1/compliance/shield/evaluate', { tool_name: 'run_command', tool_args: { cmd: 'ls' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ verdict: 'ALLOW', reason: 'no_policy' });
    expect(chains.audit_log).toBeUndefined();
  });

  it('ALLOWs with reason no_policy when the tool_policies table is missing (fail-open pre-migration)', async () => {
    queued.tool_policies = [{ data: null, error: TABLE_MISSING }];
    const res = await post('/api/v1/compliance/shield/evaluate', { tool_name: 'run_command', tool_args: { cmd: 'ls' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ verdict: 'ALLOW', reason: 'no_policy' });
  });

  it('ALLOWs valid args and writes a PROCEED audit entry synchronously', async () => {
    queued.tool_policies = [{ data: policyRow('block'), error: null }];
    const res = await post('/api/v1/compliance/shield/evaluate', {
      tool_name: 'run_command', tool_args: { cmd: 'ls -la' }, agent_id: 'agent-9', trace_id: 'tr-1',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verdict).toBe('ALLOW');
    expect(body.reason).toBe('schema_valid');
    expect(body.policy_id).toBe('pol-1');
    expect(body.errors).toBeUndefined();

    const audit = chains.audit_log?.[0].insert.mock.calls[0][0];
    expect(audit).toMatchObject({
      org_id: 'org-1',
      agent_id: 'agent-9',
      event_type: 'shield_evaluation',
      action: 'tool_use:run_command',
      verdict: 'PROCEED',
    });
  });

  it('BLOCKs invalid args when enforcement=block, with errors and a BLOCK audit entry', async () => {
    queued.tool_policies = [{ data: policyRow('block'), error: null }];
    const res = await post('/api/v1/compliance/shield/evaluate', {
      tool_name: 'run_command', tool_args: { cmd: 42 },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK');
    expect(body.reason).toBe('schema_violation');
    expect(body.errors.length).toBeGreaterThan(0);
    expect(chains.pending_approvals).toBeUndefined();

    const audit = chains.audit_log?.[0].insert.mock.calls[0][0];
    expect(audit.verdict).toBe('BLOCK');
    expect(audit.metadata.validation_errors.length).toBeGreaterThan(0);
    expect(audit.metadata.tool_args).toEqual({ cmd: 42 });
  });

  it('suspends into HITL when enforcement=require_approval: creates a pending_approvals row, returns REQUIRE_APPROVAL + approval_id, audits REVIEW', async () => {
    queued.tool_policies = [{ data: policyRow('require_approval'), error: null }];
    queued.pending_approvals = [{ data: { id: 'appr-123' }, error: null }];
    const res = await post('/api/v1/compliance/shield/evaluate', {
      tool_name: 'run_command', tool_args: { cmd: 42 }, agent_id: 'agent-9', trace_id: 'tr-7',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verdict).toBe('REQUIRE_APPROVAL');
    expect(body.approval_id).toBe('appr-123');
    expect(body.errors.length).toBeGreaterThan(0);

    // Same insert shape as POST /shield/suspend
    const approvalInsert = chains.pending_approvals?.[0].insert.mock.calls[0][0];
    expect(approvalInsert).toEqual({
      org_id: 'org-1',
      agent_id: 'agent-9',
      trace_id: 'tr-7',
      tool_name: 'run_command',
      tool_args: { cmd: 42 },
      status: 'PENDING',
    });

    const audit = chains.audit_log?.[0].insert.mock.calls[0][0];
    expect(audit.verdict).toBe('REVIEW');
    expect(audit.metadata.approval_id).toBe('appr-123');
  });

  it('fails closed (BLOCK, approval_unavailable) when the HITL insert fails under require_approval', async () => {
    queued.tool_policies = [{ data: policyRow('require_approval'), error: null }];
    queued.pending_approvals = [{ data: null, error: { code: '42P01', message: 'relation "pending_approvals" does not exist' } }];
    const res = await post('/api/v1/compliance/shield/evaluate', {
      tool_name: 'run_command', tool_args: { cmd: 42 },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verdict).toBe('BLOCK');
    expect(body.reason).toBe('approval_unavailable');
  });

  it('ALLOWs invalid args when enforcement=monitor (log-only), returning errors and auditing PROCEED', async () => {
    queued.tool_policies = [{ data: policyRow('monitor'), error: null }];
    const res = await post('/api/v1/compliance/shield/evaluate', {
      tool_name: 'run_command', tool_args: {},
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verdict).toBe('ALLOW');
    expect(body.reason).toBe('monitor_only');
    expect(body.errors.length).toBeGreaterThan(0);

    const audit = chains.audit_log?.[0].insert.mock.calls[0][0];
    expect(audit.verdict).toBe('PROCEED');
    expect(audit.reasoning).toContain('violated');
  });
});

// ═══════════════════════════════════════════════════════
//  Policy CRUD
// ═══════════════════════════════════════════════════════

describe('GET /api/v1/compliance/shield/policies', () => {
  it('returns the org policies', async () => {
    queued.tool_policies = [{ data: [policyRow('block')], error: null }];
    const res = await fetch(`${base}/api/v1/compliance/shield/policies`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].tool_name).toBe('run_command');
    // Scoped by org
    expect(chains.tool_policies?.[0].eq).toHaveBeenCalledWith('org_id', 'org-1');
  });

  it('returns [] when the table is missing (graceful degradation)', async () => {
    queued.tool_policies = [{ data: null, error: TABLE_MISSING }];
    const res = await fetch(`${base}/api/v1/compliance/shield/policies`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe('POST /api/v1/compliance/shield/policies', () => {
  it('upserts a valid policy and returns 201', async () => {
    queued.tool_policies = [{ data: policyRow('block'), error: null }];
    const res = await post('/api/v1/compliance/shield/policies', {
      tool_name: 'run_command', schema: CMD_SCHEMA, enforcement: 'block',
    });
    expect(res.status).toBe(201);
    const upsert = chains.tool_policies?.[0].upsert.mock.calls[0];
    expect(upsert[0]).toMatchObject({
      org_id: 'org-1', tool_name: 'run_command', schema: CMD_SCHEMA, enforcement: 'block', active: true,
    });
    expect(upsert[1]).toEqual({ onConflict: 'org_id,tool_name' });
  });

  it('rejects an invalid enforcement value with 400', async () => {
    const res = await post('/api/v1/compliance/shield/policies', {
      tool_name: 'run_command', schema: CMD_SCHEMA, enforcement: 'nuke',
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('enforcement');
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('rejects a schema that Ajv cannot compile with 400', async () => {
    const res = await post('/api/v1/compliance/shield/policies', {
      tool_name: 'run_command',
      schema: { type: 'not-a-real-type' },
      enforcement: 'block',
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid JSON Schema');
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('rejects a non-object schema with 400', async () => {
    const res = await post('/api/v1/compliance/shield/policies', {
      tool_name: 'run_command', schema: 'true', enforcement: 'monitor',
    });
    expect(res.status).toBe(400);
  });

  it('returns 503 when the tool_policies table is missing', async () => {
    queued.tool_policies = [{ data: null, error: TABLE_MISSING }];
    const res = await post('/api/v1/compliance/shield/policies', {
      tool_name: 'run_command', schema: CMD_SCHEMA,
    });
    expect(res.status).toBe(503);
  });
});

describe('DELETE /api/v1/compliance/shield/policies/:id', () => {
  it('deletes the policy scoped by org', async () => {
    queued.tool_policies = [{ data: null, error: null }];
    const res = await fetch(`${base}/api/v1/compliance/shield/policies/pol-1`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    const chain = chains.tool_policies?.[0];
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'pol-1');
    expect(chain.eq).toHaveBeenCalledWith('org_id', 'org-1');
  });
});
