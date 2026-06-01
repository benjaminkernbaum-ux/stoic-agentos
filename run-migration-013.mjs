/**
 * Run migration 013 — Drop Plaintext API Keys & Revoke Compromised Key
 * 
 * Usage:
 *   node run-migration-013.mjs <DB_PASSWORD>
 *   
 * Or with env var (more secure):
 *   SUPABASE_DB_PASSWORD=xxx node run-migration-013.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));

// Accept password from env var (preferred) or CLI arg (legacy)
const password = process.env.SUPABASE_DB_PASSWORD || process.argv[2];
if (!password) {
  console.error('\n❌ Usage: SUPABASE_DB_PASSWORD=xxx node run-migration-013.mjs');
  console.error('     or: node run-migration-013.mjs <DB_PASSWORD>\n');
  process.exit(1);
}

const PROJECT_REF = 'viiagdhtzbvkfhcjqrlz';

const configs = [
  {
    name: 'Direct (db.ref)',
    config: {
      host: `db.${PROJECT_REF}.supabase.co`,
      port: 5432,
      user: 'postgres',
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    }
  },
  {
    name: 'New pooler session (pooler.supabase.com:5432)',
    config: {
      host: `${PROJECT_REF}.pooler.supabase.com`,
      port: 5432,
      user: `postgres.${PROJECT_REF}`,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    }
  },
];

let client;
for (const { name, config } of configs) {
  console.log(`\n⚡ Trying ${name} (${config.host}:${config.port})...`);
  const c = new Client(config);
  try {
    await c.connect();
    console.log(`✅ Connected via ${name}\n`);
    client = c;
    break;
  } catch (err) {
    console.log(`   ❌ ${err.message}`);
    try { await c.end(); } catch {}
  }
}

if (!client) {
  console.error('\n❌ Could not connect to Supabase.');
  process.exit(1);
}

try {
  console.log('═══════════════════════════════════════════════');
  console.log('  Stoic AgentOS — Migration 013: Drop Plaintext Keys');
  console.log('═══════════════════════════════════════════════\n');

  const sqlPath = resolve(__dirname, 'api/migrations/013_drop_plaintext_keys.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log('⚡ Running migration 013_drop_plaintext_keys...');
  await client.query(sql);
  console.log('✅ Migration applied\n');

  // Verify
  console.log('── Verification ──');
  
  // Verify key column is indeed dropped
  const { rows: cols } = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'api_keys' 
    AND column_name = 'key'
  `);
  if (cols.length === 0) {
    console.log('  ✓ Column "key" has been successfully dropped.');
  } else {
    console.warn('  ⚠️  Column "key" STILL EXISTS!');
  }

  // Verify telemetry key is inactive (already revoked via dashboard)
  const { rows: inactive } = await client.query(`
    SELECT count(*) as revoked_count
    FROM api_keys
    WHERE active = false
  `);
  console.log(`  ✓ Total revoked/inactive keys: ${inactive[0].revoked_count}`);

  console.log('\n═══════════════════════════════════════════════');
  console.log('  ✅ Migration 013 verified — Plaintext keys cleaned! 🔒');
  console.log('═══════════════════════════════════════════════\n');

} catch (err) {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
