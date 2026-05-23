/**
 * Run pending migrations (004 + 005) against Supabase Postgres.
 * 
 * Usage:
 *   node run-migrations.mjs <DB_PASSWORD>
 *   
 * Get your DB password from:
 *   https://supabase.com/dashboard/project/viiagdhtzbvkfhcjqrlz/settings/database
 *   → "Connection string" section → copy the password
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));

const password = process.argv[2];
if (!password) {
  console.error('\n❌ Usage: node run-migrations.mjs <DB_PASSWORD>');
  console.error('\n   Get your password from:');
  console.error('   https://supabase.com/dashboard/project/viiagdhtzbvkfhcjqrlz/settings/database\n');
  process.exit(1);
}

const connectionString = `postgresql://postgres.viiagdhtzbvkfhcjqrlz:${encodeURIComponent(password)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

const migrations = [
  { name: '004_upsert_constraints', file: 'api/migrations/004_upsert_constraints.sql' },
  { name: '005_hot_cache', file: 'api/migrations/005_hot_cache.sql' },
];

try {
  console.log('\n⚡ Connecting to Supabase Postgres...');
  await client.connect();
  console.log('✅ Connected\n');

  for (const m of migrations) {
    const sqlPath = resolve(__dirname, m.file);
    const sql = readFileSync(sqlPath, 'utf-8');
    console.log(`⚡ Running ${m.name}...`);
    try {
      await client.query(sql);
      console.log(`✅ ${m.name} — applied\n`);
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`⏭️  ${m.name} — already applied (skipped)\n`);
      } else {
        throw err;
      }
    }
  }

  // Verify migration 004
  console.log('── Verifying migration 004 ──');
  const { rows: idx004 } = await client.query(`
    SELECT indexname FROM pg_indexes 
    WHERE indexname IN ('idx_agents_org_name_unique', 'idx_traces_org_trace_id_unique')
    ORDER BY indexname
  `);
  idx004.forEach(r => console.log(`  ✓ ${r.indexname}`));
  console.log(`  ${idx004.length}/2 indexes present\n`);

  // Verify migration 005
  console.log('── Verifying migration 005 ──');
  const { rows: cols } = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name IN ('hot_cache', 'hot_cache_updated_at', 'hot_cache_stale')
    ORDER BY column_name
  `);
  cols.forEach(r => console.log(`  ✓ ${r.column_name} (${r.data_type})`));

  const { rows: triggers } = await client.query(`
    SELECT trigger_name FROM information_schema.triggers 
    WHERE trigger_name = 'trg_mark_hot_cache_stale' LIMIT 1
  `);
  console.log(`  ✓ trigger trg_mark_hot_cache_stale: ${triggers.length > 0 ? 'active' : 'NOT FOUND'}`);

  const { rows: indexes } = await client.query(`
    SELECT indexname FROM pg_indexes 
    WHERE indexname = 'idx_observations_org_created' LIMIT 1
  `);
  console.log(`  ✓ index idx_observations_org_created: ${indexes.length > 0 ? 'active' : 'NOT FOUND'}`);

  const allGood = cols.length === 3 && triggers.length > 0 && indexes.length > 0 && idx004.length === 2;
  
  if (allGood) {
    console.log('\n✅ All migrations verified — hot cache is live! 🚀\n');
  } else {
    console.log('\n⚠️  Some verifications failed — check output above.\n');
    process.exit(1);
  }

} catch (err) {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
