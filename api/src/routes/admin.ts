/**
 * TEMPORARY admin migration endpoint.
 * Executes DDL migrations via the existing Supabase connection.
 * Protected by a one-time admin secret.
 * 
 * DELETE THIS FILE AFTER MIGRATIONS ARE APPLIED.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../middleware/db.js';

const router = Router();

// One-time admin secret — rotated after use
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
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Execute via Supabase's rpc — we need to create a helper function first
    // Use the raw fetch approach with the Supabase REST API
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';

    // Execute SQL via Supabase's pg_net or direct query
    // Since we have the service key, we can call the SQL endpoint
    const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });
    
    if (error) {
      // If exec_sql doesn't exist, try creating it first
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        return res.status(503).json({ 
          error: 'exec_sql function not found',
          hint: 'The exec_sql helper function needs to be created first',
          details: error.message,
        });
      }
      return res.status(500).json({ error: error.message, code: error.code });
    }

    res.json({ status: 'ok', result: data });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Schema check endpoint — no DDL needed
router.get('/api/v1/admin/schema-check', async (req: Request, res: Response) => {
  try {
    const { secret } = req.query;
    if (secret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Check what columns exist on organizations
    const { data: orgs, error: orgErr } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);

    const orgColumns = orgs && orgs.length > 0 ? Object.keys(orgs[0]) : [];

    // Check what tables exist
    const tables = ['organizations', 'agents', 'workspaces', 'observations', 'knowledge_items', 
                    'api_keys', 'anthropic_usage', 'traces', 'spans', 'alert_rules'];
    
    const tableChecks: Record<string, boolean> = {};
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      tableChecks[table] = !error;
    }

    // Check for hot_cache columns
    const hasHotCache = orgColumns.includes('hot_cache');
    const hasHotCacheStale = orgColumns.includes('hot_cache_stale');
    const hasHotCacheUpdatedAt = orgColumns.includes('hot_cache_updated_at');

    res.json({
      status: 'ok',
      tables: tableChecks,
      org_columns: orgColumns,
      hot_cache: {
        hot_cache: hasHotCache,
        hot_cache_stale: hasHotCacheStale,
        hot_cache_updated_at: hasHotCacheUpdatedAt,
      },
      migration_005_applied: hasHotCache && hasHotCacheStale && hasHotCacheUpdatedAt,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
