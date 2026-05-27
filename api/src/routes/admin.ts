/**
 * TEMPORARY admin migration endpoint.
 * Uses Supabase JS client's SQL tagged template for DDL execution.
 * Protected by a one-time admin secret.
 * 
 * DELETE THIS FILE AFTER MIGRATIONS ARE APPLIED.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const ADMIN_SECRET = 'stoic_migrate_2026_tmp_xK9v';

// Create a service-role client that can execute SQL
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

router.post('/api/v1/admin/migrate', async (req: Request, res: Response) => {
  try {
    const { secret, sql, statements } = req.body;
    
    if (secret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    // If statements array is provided, execute each one
    const sqlStatements: string[] = statements || (sql ? [sql] : []);
    
    if (sqlStatements.length === 0) {
      return res.status(400).json({ error: 'sql string or statements array required' });
    }

    const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' },
    });

    const results: Array<{ index: number; status: string; error?: string }> = [];

    for (let i = 0; i < sqlStatements.length; i++) {
      const stmt = sqlStatements[i].trim();
      if (!stmt || stmt.startsWith('--')) {
        results.push({ index: i, status: 'skipped' });
        continue;
      }

      try {
        // Use the Supabase REST SQL endpoint directly
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_ddl`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query_text: stmt }),
        });

        if (response.ok) {
          results.push({ index: i, status: 'ok' });
        } else {
          const errBody = await response.text();
          results.push({ index: i, status: 'error', error: errBody });
        }
      } catch (err: unknown) {
        results.push({ index: i, status: 'error', error: (err as Error).message });
      }
    }

    res.json({ status: 'ok', results });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Direct SQL via fetch to Supabase's PostgREST pg/query endpoint
router.post('/api/v1/admin/exec-sql', async (req: Request, res: Response) => {
  try {
    const { secret, sql } = req.body;
    
    if (secret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    if (!sql) {
      return res.status(400).json({ error: 'sql required' });
    }

    // Use Supabase's undocumented but working SQL endpoint
    // The /pg/query endpoint accepts raw SQL with service_role key
    const response = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'x-request-id': `migrate-${Date.now()}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    const body = await response.text();
    
    if (response.ok) {
      try {
        res.json({ status: 'ok', result: JSON.parse(body) });
      } catch {
        res.json({ status: 'ok', result: body });
      }
    } else {
      res.status(response.status).json({ 
        status: 'error', 
        httpStatus: response.status, 
        body 
      });
    }
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

    // Also check what endpoints are available
    const endpoints = {
      supabase_url: SUPABASE_URL ? 'set' : 'missing',
      service_key: SUPABASE_SERVICE_KEY ? `set (${SUPABASE_SERVICE_KEY.slice(0,20)}...)` : 'missing',
    };

    res.json({
      status: 'ok',
      tables: tableChecks,
      org_columns: orgColumns,
      endpoints,
      migration_005_applied: orgColumns.includes('hot_cache'),
      migration_008_applied: tableChecks.working_memory && tableChecks.episodic_memory && tableChecks.semantic_memory,
      migration_009_applied: tableChecks.audit_log,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
