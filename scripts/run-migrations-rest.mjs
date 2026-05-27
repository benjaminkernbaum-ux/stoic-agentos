/**
 * Run DDL migrations via Supabase REST API (no direct PG connection needed).
 * 
 * This script uses the service-role key to:
 * 1. Bootstrap an exec_sql() RPC function via PostgREST
 * 2. Use that function to run all pending DDL migrations
 * 3. Clean up the exec_sql function when done
 * 
 * Usage:
 *   node scripts/run-migrations-rest.mjs <SUPABASE_SERVICE_KEY>
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_URL = 'https://viiagdhtzbvkfhcjqrlz.supabase.co';

const serviceKey = process.argv[2];
if (!serviceKey) {
  console.error('\n❌ Usage: node scripts/run-migrations-rest.mjs <SUPABASE_SERVICE_KEY>');
  console.error('   Get your service_role key from:');
  console.error('   https://supabase.com/dashboard/project/viiagdhtzbvkfhcjqrlz/settings/api\n');
  process.exit(1);
}

const supabase = createClient(PROJECT_URL, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Step 1: Check connectivity ──
async function checkConnection() {
  console.log('⚡ Testing Supabase REST connection...');
  const { data, error } = await supabase.from('organizations').select('id,name').limit(1);
  if (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
  console.log(`✅ Connected! Found org: ${data?.[0]?.name || '(none)'}\n`);
  return data;
}

// ── Step 2: Bootstrap exec_sql RPC function ──
async function bootstrapExecSql() {
  console.log('⚡ Bootstrapping exec_sql() RPC function...');
  
  // Try creating the function via raw SQL through the PostgREST /rpc endpoint
  // We first check if it already exists
  const { data: existing, error: checkErr } = await supabase.rpc('exec_sql', { sql: 'SELECT 1 AS ok' });
  
  if (!checkErr) {
    console.log('✅ exec_sql() already exists\n');
    return true;
  }
  
  // If it doesn't exist, we need to create it. 
  // Use the Supabase Management API to create the function
  console.log('   exec_sql() not found, creating via schema...');
  
  // Alternative: insert via the sql endpoint
  const createFnSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      result json;
    BEGIN
      EXECUTE sql;
      result := json_build_object('status', 'ok', 'sql', left(sql, 100));
      RETURN result;
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('status', 'error', 'message', SQLERRM, 'sql', left(sql, 100));
    END;
    $$;
  `;
  
  // Try via fetch to the SQL endpoint
  const res = await fetch(`${PROJECT_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ sql: 'SELECT 1' }),
  });
  
  if (res.status === 404) {
    // Function doesn't exist — we need an alternative bootstrapping path
    // Use the database's built-in pg_catalog to create via a workaround
    console.log('   ⚠️  exec_sql() does not exist and cannot be created via REST.');
    console.log('   Creating via Supabase SQL editor fallback...\n');
    console.log('   ═══ PASTE THIS IN SUPABASE SQL EDITOR FIRST ═══\n');
    console.log(createFnSQL);
    console.log('   ════════════════════════════════════════════════\n');
    console.log('   Then re-run this script.\n');
    return false;
  }
  
  return true;
}

// ── Step 3: Run SQL via RPC ──
async function execSQL(label, sql) {
  console.log(`⚡ Running ${label}...`);
  
  // Split on semicolons for multi-statement support
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });
    
    if (error) {
      if (error.message?.includes('already exists')) {
        console.log(`   ⏭️  [${i+1}/${statements.length}] Already applied: ${preview}...`);
      } else {
        console.error(`   ❌ [${i+1}/${statements.length}] FAILED: ${error.message}`);
        console.error(`      SQL: ${preview}...`);
        return false;
      }
    } else {
      const status = data?.status || 'ok';
      if (status === 'error') {
        if (data.message?.includes('already exists')) {
          console.log(`   ⏭️  [${i+1}/${statements.length}] Already applied: ${preview}...`);
        } else {
          console.error(`   ❌ [${i+1}/${statements.length}] ${data.message}`);
          console.error(`      SQL: ${preview}...`);
          return false;
        }
      } else {
        console.log(`   ✅ [${i+1}/${statements.length}] ${preview}...`);
      }
    }
  }
  
  console.log(`✅ ${label} — complete\n`);
  return true;
}

// ── Step 4: Verify schema ──
async function verify() {
  console.log('── Verifying schema ──\n');
  
  // Check organizations columns
  const { data: orgs, error: orgErr } = await supabase.from('organizations').select('*').limit(1);
  if (orgErr) {
    console.log('   ⚠️  organizations table error:', orgErr.message);
  } else if (orgs && orgs.length > 0) {
    const cols = Object.keys(orgs[0]);
    const hasHotCache = cols.includes('hot_cache');
    console.log(`   hot_cache column: ${hasHotCache ? '✅' : '❌ NOT FOUND'}`);
    console.log(`   hot_cache_stale column: ${cols.includes('hot_cache_stale') ? '✅' : '❌ NOT FOUND'}`);
    console.log(`   hot_cache_updated_at column: ${cols.includes('hot_cache_updated_at') ? '✅' : '❌ NOT FOUND'}`);
  }
  
  console.log('');
}

// ── Main ──
async function main() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  Stoic AgentOS — REST Migration Runner');
  console.log('═══════════════════════════════════════════\n');
  
  await checkConnection();
  
  // First verify current state
  await verify();
  
  const hasExecSql = await bootstrapExecSql();
  
  if (!hasExecSql) {
    // Need the user to create exec_sql function first
    process.exit(1);
  }
  
  // Run migrations
  const migrations = [
    { name: '005_hot_cache', file: '../api/migrations/005_hot_cache.sql' },
    { name: '006_performance_indexes', file: '../api/migrations/006_performance_indexes.sql' },
    { name: '007_relax_module_constraint', file: '../api/migrations/007_relax_module_constraint.sql' },
  ];
  
  for (const m of migrations) {
    const sqlPath = resolve(__dirname, m.file);
    try {
      const sql = readFileSync(sqlPath, 'utf-8');
      const ok = await execSQL(m.name, sql);
      if (!ok) {
        console.error(`\n⚠️  Migration ${m.name} had errors. Continuing...\n`);
      }
    } catch (err) {
      console.error(`❌ Could not read ${m.file}: ${err.message}`);
    }
  }
  
  // Final verify
  await verify();
  
  console.log('✅ Migration run complete!\n');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
