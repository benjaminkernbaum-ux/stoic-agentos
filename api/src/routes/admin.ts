/**
 * TEMPORARY admin migration endpoint v5.
 * Connects to Supabase Postgres directly from Railway.
 * DELETE THIS FILE AFTER MIGRATIONS ARE APPLIED.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import pg from 'pg';

const router = Router();
const ADMIN_SECRET = 'stoic_migrate_2026_tmp_xK9v';
const SUPABASE_URL = process.env.SUPABASE_URL || '';

function getRef(): string {
  const m = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  return m?.[1] || '';
}

// Execute DDL via direct PG connection from Railway
router.post('/api/v1/admin/exec-sql', async (req: Request, res: Response) => {
  try {
    const { secret, sql, password } = req.body;
    if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });
    if (!sql) return res.status(400).json({ error: 'sql required' });
    if (!password) return res.status(400).json({ error: 'password required' });

    const ref = getRef();
    const configs = [
      { name: 'direct', host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres' },
      { name: 'pooler-session', host: `${ref}.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
      { name: 'pooler-txn', host: `${ref}.pooler.supabase.com`, port: 6543, user: `postgres.${ref}` },
      { name: 'aws-pooler-session', host: `aws-0-sa-east-1.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
      { name: 'aws-pooler-txn', host: `aws-0-sa-east-1.pooler.supabase.com`, port: 6543, user: `postgres.${ref}` },
      { name: 'aws-us-east1', host: `aws-0-us-east-1.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
    ];

    const errors: Array<{ name: string; error: string }> = [];

    for (const cfg of configs) {
      const client = new pg.Client({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });

      try {
        await client.connect();
        const result = await client.query(sql);
        await client.end();
        return res.json({ status: 'ok', method: cfg.name, rowCount: result.rowCount });
      } catch (err: unknown) {
        errors.push({ name: cfg.name, error: (err as Error).message });
        try { await client.end(); } catch {}
      }
    }

    res.status(503).json({ error: 'All connection methods failed', attempts: errors });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DNS probe — check which hosts Railway can resolve
router.get('/api/v1/admin/dns-probe', async (req: Request, res: Response) => {
  try {
    const { secret } = req.query;
    if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });

    const dns = await import('dns');
    const { promisify } = await import('util');
    const resolve4 = promisify(dns.resolve4);

    const ref = getRef();
    const hosts = [
      `db.${ref}.supabase.co`,
      `${ref}.pooler.supabase.com`,
      `aws-0-sa-east-1.pooler.supabase.com`,
      `aws-0-us-east-1.pooler.supabase.com`,
      `${ref}.supabase.co`,
    ];

    const results: Record<string, string[]|string> = {};
    for (const host of hosts) {
      try {
        const addrs = await resolve4(host);
        results[host] = addrs;
      } catch (err: unknown) {
        results[host] = `FAIL: ${(err as Error).message}`;
      }
    }

    res.json({ status: 'ok', ref, results });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Schema check
router.get('/api/v1/admin/schema-check', async (req: Request, res: Response) => {
  try {
    const { secret } = req.query;
    if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });

    const { supabase } = req.app.locals;
    if (!supabase) return res.status(500).json({ error: 'No DB' });

    const { data: orgs } = await supabase.from('organizations').select('*').limit(1);
    const orgCols = orgs?.[0] ? Object.keys(orgs[0]) : [];

    const tables = ['organizations','agents','workspaces','observations','knowledge_items',
                    'api_keys','anthropic_usage','traces','spans','alert_rules',
                    'working_memory','episodic_memory','semantic_memory','audit_log'];
    const checks: Record<string,boolean> = {};
    for (const t of tables) {
      const { error } = await supabase.from(t).select('id').limit(1);
      checks[t] = !error;
    }

    res.json({ status:'ok', tables:checks, org_columns:orgCols,
      m005: orgCols.includes('hot_cache'),
      m008: checks.working_memory && checks.episodic_memory && checks.semantic_memory && checks.audit_log,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
