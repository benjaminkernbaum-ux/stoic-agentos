/**
 * TEMPORARY admin migration endpoint v4.
 * Exposes env vars and uses Supabase Management API for DDL.
 * DELETE THIS FILE AFTER MIGRATIONS ARE APPLIED.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();
const ADMIN_SECRET = 'stoic_migrate_2026_tmp_xK9v';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Get the project ref from the URL
function getProjectRef(): string {
  const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] || '';
}

// Execute SQL via the Supabase Management API
router.post('/api/v1/admin/exec-sql', async (req: Request, res: Response) => {
  try {
    const { secret, sql } = req.body;
    
    if (secret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    if (!sql) {
      return res.status(400).json({ error: 'sql required' });
    }

    const ref = getProjectRef();

    // Method 1: Try Supabase's internal postgres connection
    // On Railway, we might be able to reach the DB directly
    try {
      const pg = await import('pg');
      const configs = [
        { host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD || '' },
        { host: `${ref}.supabase.co`, port: 5432, user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD || '' },
      ];

      for (const cfg of configs) {
        if (!cfg.password) continue;
        const client = new pg.default.Client({
          ...cfg, database: 'postgres', ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000,
        });
        try {
          await client.connect();
          const result = await client.query(sql);
          await client.end();
          return res.json({ status: 'ok', method: `pg:${cfg.host}`, rowCount: result.rowCount });
        } catch {
          try { await client.end(); } catch {}
        }
      }
    } catch {}

    // Method 2: Use Supabase's PostgREST with a helper function approach
    // First, check if we can create a function via the service key
    // The service_role key bypasses RLS but PostgREST still only serves pre-existing functions
    
    return res.status(503).json({
      error: 'No SQL execution method available',
      ref,
      supabase_url: SUPABASE_URL ? 'set' : 'missing',
      service_key_length: SUPABASE_SERVICE_KEY.length,
      db_password: process.env.SUPABASE_DB_PASSWORD ? 'set' : 'missing',
      database_url: process.env.DATABASE_URL ? 'set' : 'missing',
      env_keys: Object.keys(process.env).filter(k => k.includes('SUPA') || k.includes('DB') || k.includes('PG') || k.includes('DATABASE') || k.includes('POSTGRES')).sort(),
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Env vars endpoint to diagnose what Railway has
router.get('/api/v1/admin/env-check', async (req: Request, res: Response) => {
  try {
    const { secret } = req.query;
    if (secret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Show relevant env vars (sanitized)
    const relevant = Object.entries(process.env)
      .filter(([k]) => k.includes('SUPA') || k.includes('DB') || k.includes('PG') || k.includes('DATABASE') || k.includes('POSTGRES') || k.includes('RAILWAY') || k.includes('PORT'))
      .map(([k, v]) => {
        if (k.includes('KEY') || k.includes('SECRET') || k.includes('PASSWORD') || k.includes('TOKEN')) {
          return [k, v ? `${v.slice(0, 30)}... (len:${v.length})` : 'UNSET'];
        }
        return [k, v || 'UNSET'];
      });

    res.json({
      status: 'ok',
      env: Object.fromEntries(relevant),
      all_keys: Object.keys(process.env).sort(),
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Schema check endpoint
router.get('/api/v1/admin/schema-check', async (req: Request, res: Response) => {
  try {
    const { secret } = req.query;
    if (secret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { supabase } = req.app.locals;
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data: orgs } = await supabase.from('organizations').select('*').limit(1);
    const orgColumns = orgs && orgs.length > 0 ? Object.keys(orgs[0]) : [];

    const tables = ['organizations', 'agents', 'workspaces', 'observations', 'knowledge_items', 
                    'api_keys', 'anthropic_usage', 'traces', 'spans', 'alert_rules',
                    'working_memory', 'episodic_memory', 'semantic_memory', 'audit_log'];
    
    const tableChecks: Record<string, boolean> = {};
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      tableChecks[table] = !error;
    }

    res.json({
      status: 'ok',
      tables: tableChecks,
      org_columns: orgColumns,
      migration_005_applied: orgColumns.includes('hot_cache'),
      migration_008_applied: tableChecks.working_memory && tableChecks.episodic_memory && tableChecks.semantic_memory,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
