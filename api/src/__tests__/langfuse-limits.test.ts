/**
 * Langfuse imports count toward the monthly trace quota (audit finding #8).
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

let monthlyCount = 0;
const traceInserts = vi.fn();

vi.mock('./../lib/counterCache.js', () => ({
  getMonthlyCount: async () => monthlyCount,
  incrementCounter: vi.fn(),
}));

vi.mock('./../middleware/db.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('../middleware/db.js')>();
  return {
    ...real,
    supabase: {
      from: (table: string) => ({
        insert: (row: unknown) => {
          if (table === 'traces') traceInserts(row);
          const c: Record<string, unknown> = {};
          c.select = () => c;
          c.single = async () => ({ data: { id: 'db-1' }, error: null as unknown });
          c.then = (r: (v: unknown) => void) => r({ error: null });
          return c;
        },
      }),
    },
  };
});

let plan = 'free';
vi.mock('./../middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.org = { id: 'org-1', plan }; next(); },
}));

let server: Server;
let base: string;

beforeAll(async () => {
  const { default: langfuseRoutes } = await import('../routes/langfuse.js');
  const app = express();
  app.use(express.json());
  app.use(langfuseRoutes);
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/integrations/langfuse`;
});
afterAll(() => server.close());
beforeEach(() => { traceInserts.mockReset(); plan = 'free'; monthlyCount = 0; });

const trace = (i: number) => ({ id: `lf-${i}`, name: `t${i}`, observations: [] as unknown[] });
const post = (path: string, body: unknown) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('Langfuse import plan limits', () => {
  it('imports a single trace under the limit', async () => {
    monthlyCount = 999; // Free = 1000/month
    const res = await post('/import', trace(1));
    expect(res.status).toBe(201);
    expect(traceInserts).toHaveBeenCalledTimes(1);
  });

  it('rejects a single import once the monthly limit is reached', async () => {
    monthlyCount = 1000;
    const res = await post('/import', trace(1));
    expect(res.status).toBe(429);
    expect(traceInserts).not.toHaveBeenCalled();
  });

  it('rejects a whole batch that would cross the limit, importing nothing', async () => {
    monthlyCount = 950;
    const res = await post('/import/batch', { traces: Array.from({ length: 51 }, (_, i) => trace(i)) });
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ current: 950, requested: 51, limit: 1000 });
    expect(traceInserts).not.toHaveBeenCalled();
  });

  it('accepts a batch that exactly fills the remaining quota', async () => {
    monthlyCount = 950;
    const res = await post('/import/batch', { traces: Array.from({ length: 50 }, (_, i) => trace(i)) });
    expect(res.status).toBe(201);
    expect(traceInserts).toHaveBeenCalledTimes(50);
  });

  it('does not cap unlimited plans', async () => {
    plan = 'team';
    monthlyCount = 10_000_000;
    const res = await post('/import/batch', { traces: [trace(1), trace(2)] });
    expect(res.status).toBe(201);
  });
});
