/**
 * Git webhook signature: the HMAC must be checked over the exact bytes the
 * client sent, not a re-serialization of req.body.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import { createHmac } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const insert = vi.fn();

vi.mock('./../middleware/db.js', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'observations') return { insert: (row: unknown) => { insert(row); return Promise.resolve({ error: null }); } };
      const c: Record<string, unknown> = {};
      for (const m of ['select', 'eq']) c[m] = () => c;
      c.single = async () => ({ data: { id: 'key-1', org_id: 'org-1' } });
      return c;
    },
  },
}));

const { jsonBodyParser } = await import('../middleware/bodyParsing.js');
const { default: webhookRoutes } = await import('../routes/webhooks.js');

const API_KEY = 'sk_test_git_hook';
let server: Server;
let url: string;

beforeAll(async () => {
  const app = express();
  app.use(jsonBodyParser);
  app.use(webhookRoutes);
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/webhooks/git`;
});
afterAll(() => server.close());
beforeEach(() => insert.mockReset());

const sign = (raw: string) => 'sha256=' + createHmac('sha256', API_KEY).update(raw, 'utf8').digest('hex');

function send(raw: string, signature?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (signature) headers['X-Webhook-Signature'] = signature;
  return fetch(url, { method: 'POST', headers, body: raw });
}

// Whitespace and key order differ from JSON.stringify(JSON.parse(raw)),
// which is exactly what broke verification before.
const RAW = `{ "repo": "stoic",  "api_key": "${API_KEY}", "commit_hash": "abc1234def", "commit_message": "fix: \\"quoted\\"", "branch": "main" }`;

describe('POST /api/v1/webhooks/git', () => {
  it('accepts a signature computed over the exact request bytes', async () => {
    expect(JSON.stringify(JSON.parse(RAW))).not.toBe(RAW);
    const res = await send(RAW, sign(RAW));
    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ org_id: 'org-1', type: 'git_commit' }));
  });

  it('rejects a signature over a different body', async () => {
    const res = await send(RAW, sign(RAW.replace('main', 'evil')));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('INVALID_SIGNATURE');
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects a request without a signature', async () => {
    const res = await send(RAW);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('MISSING_SIGNATURE');
  });

  it('only keeps the raw body for signed routes', async () => {
    const app = express();
    app.use(jsonBodyParser);
    app.post('/api/v1/other', (req, res) => res.json({ hasRaw: 'rawBody' in req }));
    const s = app.listen(0);
    await new Promise((r) => s.once('listening', r));
    const res = await fetch(`http://127.0.0.1:${(s.address() as AddressInfo).port}/api/v1/other`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"a":1}',
    });
    expect(await res.json()).toEqual({ hasRaw: false });
    s.close();
  });
});
