/**
 * Regression tests for two audit findings:
 *  - Stripe webhook must receive the raw body (signature verification).
 *  - Rate limits must be keyed per org and sized by plan, not per IP on Free.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import Stripe from 'stripe';

const API_KEYS: Record<string, { id: string; organizations: { id: string; plan: string } }> = {};

vi.mock('./../middleware/db.js', () => {
  const chain = (result: unknown) => {
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'update', 'limit']) c[m] = () => c;
    c.single = async () => result;
    c.then = (r: (v: unknown) => void) => r({ data: null });
    return c;
  };
  return {
    supabase: {
      from: () => ({
        select: () => ({
          eq: (_col: string, hash: string) => ({
            eq: () => ({ single: async () => ({ data: API_KEYS[hash] ?? null }) }),
          }),
        }),
        update: () => chain(null),
      }),
    },
  };
});

const { jsonBodyParser } = await import('../middleware/bodyParsing.js');
const { apiLimiter, preAuthLimiter } = await import('../middleware/rateLimiter.js');
const { authenticate, hashApiKey } = await import('../middleware/auth.js');

let server: Server | undefined;
afterEach(() => { server?.close(); server = undefined; });

async function start(app: express.Express): Promise<string> {
  server = app.listen(0);
  await new Promise((r) => server!.once('listening', r));
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}

async function hit(url: string, n: number, headers: Record<string, string> = {}): Promise<number[]> {
  const statuses: number[] = [];
  for (let i = 0; i < n; i++) statuses.push((await fetch(url, { headers })).status);
  return statuses;
}

describe('Stripe webhook body parsing', () => {
  it('delivers the raw body so constructEvent can verify the signature', async () => {
    const secret = 'whsec_test_secret';
    const stripe = new Stripe('sk_test_dummy');
    const app = express();
    app.use(jsonBodyParser);
    app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), (req: Request, res: Response) => {
      try {
        const event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'] as string, secret);
        res.json({ ok: true, isBuffer: Buffer.isBuffer(req.body), type: event.type });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    });
    app.post('/other', (req: Request, res: Response) => res.json({ parsed: req.body }));
    const base = await start(app);

    const payload = JSON.stringify({ id: 'evt_1', object: 'event', type: 'checkout.session.completed' });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const res = await fetch(`${base}/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': signature },
      body: payload,
    });
    expect(await res.json()).toEqual({ ok: true, isBuffer: true, type: 'checkout.session.completed' });

    // Every other route still gets parsed JSON
    const other = await fetch(`${base}/other`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"a":1}',
    });
    expect(await other.json()).toEqual({ parsed: { a: 1 } });
  });
});

describe('Rate limiting', () => {
  function appWithOrg(plan: string, orgId: string, path = '/api/v1/agents') {
    const app = express();
    app.get(path, (req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { org: unknown }).org = { id: orgId, plan };
      next();
    }, apiLimiter, (_req: Request, res: Response) => res.json({ ok: true }));
    return { app, path };
  }

  it('limits a Free org at 100/min', async () => {
    const { app, path } = appWithOrg('free', 'org-free');
    const statuses = await hit(`${await start(app)}${path}`, 101);
    expect(statuses.slice(0, 100).every((s) => s === 200)).toBe(true);
    expect(statuses[100]).toBe(429);
  });

  it('gives a Team org its plan limit, not the Free one', async () => {
    const { app, path } = appWithOrg('team', 'org-team');
    const statuses = await hit(`${await start(app)}${path}`, 150);
    expect(statuses.every((s) => s === 200)).toBe(true);
  });

  it('exempts trace ingest, which has its own plan-aware limiter', async () => {
    const { app, path } = appWithOrg('free', 'org-ingest', '/api/v1/traces/ingest');
    const statuses = await hit(`${await start(app)}${path}`, 120);
    expect(statuses.every((s) => s === 200)).toBe(true);
  });

  it('pre-auth limiter caps anonymous IPs at the Free limit but not credentialed ones', async () => {
    const app = express();
    app.use('/api/', preAuthLimiter);
    app.get('/api/v1/x', (_req: Request, res: Response) => res.json({ ok: true }));
    const url = `${await start(app)}/api/v1/x`;

    const credentialed = await hit(url, 150, { Authorization: 'Bearer sk_live_whatever' });
    expect(credentialed.every((s) => s === 200)).toBe(true);

    const anon = await hit(url, 101);
    expect(anon.slice(0, 100).every((s) => s === 200)).toBe(true);
    expect(anon[100]).toBe(429);
  });

  it('authenticate applies the org plan limit after resolving the API key', async () => {
    const key = 'sk_live_team_key';
    API_KEYS[hashApiKey(key)] = { id: 'key-1', organizations: { id: 'org-auth-team', plan: 'team' } };
    const freeKey = 'sk_live_free_key';
    API_KEYS[hashApiKey(freeKey)] = { id: 'key-2', organizations: { id: 'org-auth-free', plan: 'free' } };

    const app = express();
    app.get('/api/v1/agents', authenticate, (_req: Request, res: Response) => res.json({ ok: true }));
    const url = `${await start(app)}/api/v1/agents`;

    const team = await hit(url, 150, { Authorization: `Bearer ${key}` });
    expect(team.every((s) => s === 200)).toBe(true);

    const free = await hit(url, 101, { Authorization: `Bearer ${freeKey}` });
    expect(free[100]).toBe(429);
  });
});
