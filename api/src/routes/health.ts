import { Router } from 'express';
import type { Request, Response } from 'express';
import pg from 'pg';

const router = Router();
const API_VERSION = 'v1';

router.get('/health', (req: Request, res: Response) => res.json({ status: 'ok', version: API_VERSION, uptime: process.uptime(), db: !!req.app.locals.supabase }));
router.get(`/api/${API_VERSION}/health`, (req: Request, res: Response) => res.json({ status: 'ok', version: API_VERSION }));

// ── Temporary: Run migration 005 via direct Postgres from Railway ──
// Railway can reach the DB (IPv4+IPv6). Protected by secret header.
// Remove after migration is applied.
router.post(`/api/${API_VERSION}/admin/run-migration-005`, async (req: Request, res: Response) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== 'stoic-migrate-005-run') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

  // Build Postgres connection from Supabase URL + service key
  // Extract project ref from SUPABASE_URL
  const refMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  const ref = refMatch?.[1] || '';

  if (!ref && !dbUrl) {
    return res.status(500).json({ error: 'No database connection info available' });
  }

  // Try to connect via pg
  const configs = dbUrl
    ? [{ name: 'DATABASE_URL', connectionString: dbUrl }]
    : [
        { name: 'db.ref (direct)', host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres', password: req.body.db_password || '', database: 'postgres' },
        { name: 'pooler 6543', host: `aws-0-sa-east-1.pooler.supabase.com`, port: 6543, user: `postgres.${ref}`, password: req.body.db_password || '', database: 'postgres' },
        { name: `${ref}.pooler`, host: `${ref}.pooler.supabase.com`, port: 6543, user: `postgres.${ref}`, password: req.body.db_password || '', database: 'postgres' },
      ];

  for (const cfg of configs) {
    const { name, ...connOpts } = cfg;
    console.log(`[migrate-005] Trying ${name}...`);
    const client = new pg.Client({ ...connOpts, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
    try {
      await client.connect();
      console.log(`[migrate-005] Connected via ${name}`);

      // Run migration DDL
      const ddl = `
        ALTER TABLE organizations ADD COLUMN IF NOT EXISTS hot_cache TEXT DEFAULT NULL;
        ALTER TABLE organizations ADD COLUMN IF NOT EXISTS hot_cache_updated_at TIMESTAMPTZ DEFAULT NULL;
        ALTER TABLE organizations ADD COLUMN IF NOT EXISTS hot_cache_stale BOOLEAN DEFAULT TRUE;

        CREATE OR REPLACE FUNCTION mark_hot_cache_stale()
        RETURNS TRIGGER AS $$
        BEGIN
          UPDATE organizations SET hot_cache_stale = TRUE WHERE id = NEW.org_id AND hot_cache_stale IS NOT TRUE;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        DROP TRIGGER IF EXISTS trg_mark_hot_cache_stale ON observations;
        CREATE TRIGGER trg_mark_hot_cache_stale AFTER INSERT ON observations FOR EACH ROW EXECUTE FUNCTION mark_hot_cache_stale();

        CREATE INDEX IF NOT EXISTS idx_observations_org_created ON observations (org_id, created_at DESC);
      `;
      await client.query(ddl);

      // Verify
      const { rows: cols } = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'organizations' AND column_name LIKE 'hot_cache%' ORDER BY column_name`
      );
      const { rows: trg } = await client.query(
        `SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'trg_mark_hot_cache_stale' LIMIT 1`
      );
      const { rows: idx } = await client.query(
        `SELECT indexname FROM pg_indexes WHERE indexname = 'idx_observations_org_created' LIMIT 1`
      );

      await client.end();
      return res.json({
        status: 'success',
        connected_via: name,
        columns: cols,
        trigger: trg.length > 0 ? 'active' : 'not_found',
        index: idx.length > 0 ? 'active' : 'not_found',
      });
    } catch (err: unknown) {
      console.log(`[migrate-005] ${name} failed: ${(err as Error).message}`);
      try { await client.end(); } catch {}
    }
  }

  res.status(500).json({ error: 'Could not connect to database from any method' });
});

export default router;
