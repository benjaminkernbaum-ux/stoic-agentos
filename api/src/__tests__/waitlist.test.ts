import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const upsert = vi.fn();

vi.mock('./../middleware/db.js', () => ({
  supabase: { from: () => ({ upsert: (...args: unknown[]) => upsert(...args) }) },
}));

const { default: waitlistRoutes } = await import('../routes/waitlist.js');

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json());
  app.use(waitlistRoutes);
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => upsert.mockReset());

let ipCounter = 0;
function post(body: unknown, ip = `10.0.0.${++ipCounter}`) {
  return fetch(`${base}/api/v1/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify(body),
  });
}

describe('POST /api/v1/waitlist', () => {
  it('stores a normalized email', async () => {
    upsert.mockResolvedValue({ error: null });
    const res = await post({ email: '  Ana@Example.COM ', source: 'landing' });
    expect(res.status).toBe(201);
    expect(upsert).toHaveBeenCalledWith(
      { email: 'ana@example.com', source: 'landing' },
      { onConflict: 'email', ignoreDuplicates: true },
    );
  });

  it('rejects an invalid email without touching the DB', async () => {
    const res = await post({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('returns 503 (not a fake success) when the migration has not run', async () => {
    upsert.mockResolvedValue({ error: { code: 'PGRST205', message: "Could not find the table 'public.waitlist'" } });
    const res = await post({ email: 'a@b.co' });
    expect(res.status).toBe(503);
  });

  it('rate-limits a single IP after 5 sign-ups per hour', async () => {
    upsert.mockResolvedValue({ error: null });
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await post({ email: `u${i}@b.co` }, '10.9.9.9')).status);
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
  });
});
