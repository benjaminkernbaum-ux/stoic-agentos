/**
 * TEMPORARY admin migration endpoint.
 * Uses Supabase's native SQL execution capabilities.
 * Protected by a one-time admin secret.
 * 
 * DELETE THIS FILE AFTER MIGRATIONS ARE APPLIED.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import pg from 'pg';

const router = Router();
const ADMIN_SECRET = 'stoic_migrate_2026_tmp_xK9v';

router.post('/api/v1/admin/migrate', async (req: Request, res: Response) => {
  try {
    const { secret, sql } = req.body;
    
    if (secret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'sql string required' });
    }

    // Use direct PG connection from Railway (same network as Supabase)
    const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    
    if (!dbUrl) {
      // Fallback: construct from known Supabase patterns
      const supabaseUrl = process.env.SUPABASE_URL || '';
      const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
      const ref = match?.[1];
      
      if (!ref) {
        return res.status(500).json({ error: 'Cannot determine database connection. Set DATABASE_URL.' });
      }
      
      // Try connecting via the internal Supabase pooler
      const configs = [
        { host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres' },
        { host: `${ref}.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
        { host: `aws-0-sa-east-1.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
      ];
      
      const password = process.env.SUPABASE_DB_PASSWORD || '';
      
      for (const cfg of configs) {
        const client = new pg.Client({
          ...cfg,
          password,
          database: 'postgres',
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 10000,
        });
        
        try {
          await client.connect();
          await client.query(sql);
          await client.end();
          return res.json({ status: 'ok', method: cfg.host });
        } catch (err: unknown) {
          try { await client.end(); } catch {}
          continue;
        }
      }
      
      return res.status(500).json({ error: 'Could not connect to database via any method' });
    }

    const client = new pg.Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    
    await client.connect();
    const result = await client.query(sql);
    await client.end();
    
    res.json({ status: 'ok', rowCount: result.rowCount });
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
      migration_009_applied: tableChecks.audit_log,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
