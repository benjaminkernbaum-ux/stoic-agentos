/**
 * Run migration 012 — API Key Hashing
 * 
 * Usage:
 *   node run-migration-012.mjs <DB_PASSWORD>
 *   
 * Or with env var (more secure):
 *   SUPABASE_DB_PASSWORD=xxx node run-migration-012.mjs
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
  console.error('\n❌ Usage: SUPABASE_DB_PASSWORD=xxx node run-migration-012.mjs');
  console.error('     or: node run-migration-012.mjs <DB_PASSWORD>\n');
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
  console.log('  Stoic AgentOS — Migration 012: API Key Hashing');
  console.log('═══════════════════════════════════════════════\n');

  const sqlPath = resolve(__dirname, 'api/migrations/012_api_key_hashing.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log('⚡ Running migration 012_api_key_hashing...');
  await client.query(sql);
  console.log('✅ Migration applied\n');

  // Verify
  console.log('── Verification ──');
  
  const { rows: cols } = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'api_keys' 
    AND column_name IN ('key_hash', 'key_prefix')
    ORDER BY column_name
  `);
  cols.forEach(r => console.log(`  ✓ column ${r.column_name} (${r.data_type})`));

  const { rows: idx } = await client.query(`
    SELECT indexname FROM pg_indexes 
    WHERE indexname = 'idx_api_keys_key_hash' LIMIT 1
  `);
  console.log(`  ✓ index idx_api_keys_key_hash: ${idx.length > 0 ? 'active' : 'NOT FOUND'}`);

  const { rows: stats } = await client.query(`
    SELECT 
      count(*) as total,
      count(key_hash) as hashed
    FROM api_keys
  `);
  console.log(`  ✓ API keys: ${stats[0].hashed}/${stats[0].total} hashed`);

  console.log('\n═══════════════════════════════════════════════');
  console.log('  ✅ Migration 012 verified — API keys secured! 🔒');
  console.log('═══════════════════════════════════════════════\n');

} catch (err) {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
