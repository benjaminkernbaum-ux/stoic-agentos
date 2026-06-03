/**
 * Migration Runner — Executes SQL migrations against Supabase
 * 
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... npx tsx run-migration.ts 014 015
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  console.error('');
  console.error('Run with:');
  console.error('  $env:SUPABASE_SERVICE_KEY="eyJ..."; npx tsx api/run-migration.ts 014 015');
  process.exit(1);
}

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const migrationsDir = join(import.meta.dirname || __dirname, 'migrations');
const targetNumbers = process.argv.slice(2);

if (targetNumbers.length === 0) {
  console.error('❌ Specify migration numbers: npx tsx run-migration.ts 014 015');
  process.exit(1);
}

// Find matching migration files
const allFiles = readdirSync(migrationsDir).sort();
const filesToRun = targetNumbers.map(num => {
  const match = allFiles.find(f => f.startsWith(num));
  if (!match) {
    console.error(`❌ No migration found starting with "${num}"`);
    process.exit(1);
  }
  return match;
});

console.log(`\n⚡ Stoic AgentOS Migration Runner`);
console.log(`   Supabase: ${SUPABASE_URL}`);
console.log(`   Migrations: ${filesToRun.join(', ')}\n`);

// Execute each migration via Supabase REST RPC (pg function)
// Using the PostgREST /rpc endpoint isn't available for raw SQL,
// so we use the Supabase Management API's SQL endpoint instead.
for (const file of filesToRun) {
  const sql = readFileSync(join(migrationsDir, file), 'utf-8');
  console.log(`📄 Running ${file}...`);
  
  // Split by statement (handle multi-statement migrations)
  // Execute via fetch to Supabase's pg_net or direct SQL endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({})
  });

  // The REST API can't run raw SQL — we need the management API
  // Try the pg SQL endpoint instead
  const sqlResponse = await fetch(`${SUPABASE_URL}/pg/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!sqlResponse.ok) {
    const err = await sqlResponse.text();
    console.error(`   ❌ FAILED: ${sqlResponse.status} — ${err}`);
    
    // Fallback: print SQL for manual execution
    console.error(`\n   ⚠️  Copy this SQL to Supabase SQL Editor:\n`);
    console.error(`   ${SUPABASE_URL.replace('.supabase.co', '')}/project/sql/new\n`);
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
  } else {
    const result = await sqlResponse.json();
    console.log(`   ✅ ${file} — Success`);
  }
}

console.log('\n✅ Done.\n');
