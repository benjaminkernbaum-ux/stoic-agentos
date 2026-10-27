/**
 * Reflection routes: role check + AI rate limit (audit finding #9).
 * Anthropic is reported as unconfigured, so a request that clears the guards
 * stops at the 402 and never reaches the DB or Claude.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

vi.mock('./../middleware/db.js', () => ({ supabase: {} }));
vi.mock('./../lib/anthropic.js', () => ({ hasAnthropic: () => false, complete: vi.fn() }));

type Caller = { role?: string; apiKey?: boolean; orgId: string };
const callers: Record<string, Caller> = {
  member: { role: 'member', orgId: 'org-member' },
  admin: { role: 'admin', orgId: 'org-admin' },
  key: { apiKey: true, orgId: 'org-key' },
  burst: { role: 'owner', orgId: 'org-burst' },
};
vi.mock('./../middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const c = callers[req.headers['x-caller'] as string];
    req.org = { id: c.orgId, plan: 'free' };
    if (c.role) req.role = c.role;
    if (c.apiKey) req.apiKey = { id: 'key-1' };
    next();
  },
}));

let server: Server;
let base: string;

beforeAll(async () => {
  const { default: reflectionRoutes } = await import('../routes/reflection.js');
  const app = express();
  app.use(express.json());
  app.use(reflectionRoutes);
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/reflection`;
});
afterAll(() => server.close());

const call = (path: string, caller: string) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'x-caller': caller } });

describe('reflection guards', () => {
  it.each(['/run', '/consolidate', '/decay'])('%s is forbidden for a member', async (path) => {
    expect((await call(path, 'member')).status).toBe(403);
  });

  it.each(['/run', '/consolidate'])('%s lets an admin through to the handler', async (path) => {
    expect((await call(path, 'admin')).status).toBe(402);
  });

  it('treats an API key as owner-level', async () => {
    expect((await call('/run', 'key')).status).toBe(402);
  });

  it('applies the AI rate limit (Free: 20/min) to Claude-backed routes', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) statuses.push((await call('/run', 'burst')).status);
    expect(statuses.slice(0, 20).every((s) => s === 402)).toBe(true);
    expect(statuses[20]).toBe(429);
  });
});
