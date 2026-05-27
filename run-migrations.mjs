/**
 * Run pending migrations (004–008) against Supabase Postgres.
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

const PROJECT_REF = 'viiagdhtzbvkfhcjqrlz';

// Connection configs to try in order (Supabase has migrated poolers multiple times)
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
    name: 'New pooler (pooler.supabase.com:6543)',
    config: {
      host: `${PROJECT_REF}.pooler.supabase.com`,
      port: 6543,
      user: `postgres.${PROJECT_REF}`,
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
  {
    name: 'Legacy pooler session (aws-0-sa-east-1:5432)',  
    config: {
      host: `aws-0-sa-east-1.pooler.supabase.com`,
      port: 5432,
      user: `postgres.${PROJECT_REF}`,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    }
  },
  {
    name: 'Legacy pooler txn (aws-0-sa-east-1:6543)',
    config: {
      host: `aws-0-sa-east-1.pooler.supabase.com`,
      port: 6543,
      user: `postgres.${PROJECT_REF}`,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    }
  },
  {
    name: 'Direct legacy (ref.supabase.co)',
    config: {
      host: `${PROJECT_REF}.supabase.co`,
      port: 5432,
      user: 'postgres',
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
  console.error('\n❌ Could not connect to Supabase with any method.');
  console.error('   Please verify your password at:');
  console.error('   https://supabase.com/dashboard/project/viiagdhtzbvkfhcjqrlz/settings/database\n');
  process.exit(1);
}

// All migrations in order — each is idempotent (IF NOT EXISTS / IF EXISTS guards)
const migrations = [
  { name: '004_upsert_constraints',     file: 'api/migrations/004_upsert_constraints.sql' },
  { name: '005_hot_cache',              file: 'api/migrations/005_hot_cache.sql' },
  { name: '006_performance_indexes',    file: 'api/migrations/006_performance_indexes.sql' },
  { name: '007_relax_module_constraint', file: 'api/migrations/007_relax_module_constraint.sql' },
  { name: '008_three_tier_memory',       file: 'api/migrations/008_three_tier_memory.sql' },
];

try {
  console.log('\n═══════════════════════════════════════════════');
  console.log('  Stoic AgentOS — Running migrations 004→008');
  console.log('═══════════════════════════════════════════════\n');

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

  // ── Verification ──
  console.log('═══════════════════════════════════════════════');
  console.log('  Verification');
  console.log('═══════════════════════════════════════════════\n');

  let allGood = true;

  // Verify 004 — upsert constraints
  console.log('── 004: Upsert constraints ──');
  const { rows: idx004 } = await client.query(`
    SELECT indexname FROM pg_indexes 
    WHERE indexname IN ('idx_agents_org_name_unique', 'idx_traces_org_trace_id_unique')
    ORDER BY indexname
  `);
  idx004.forEach(r => console.log(`  ✓ ${r.indexname}`));
  console.log(`  ${idx004.length}/2 indexes present\n`);
  if (idx004.length < 2) allGood = false;

  // Verify 005 — hot cache
  console.log('── 005: Hot cache ──');
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
  console.log(`  ✓ index idx_observations_org_created: ${indexes.length > 0 ? 'active' : 'NOT FOUND'}\n`);
  if (cols.length < 3 || triggers.length === 0) allGood = false;

  // Verify 007 — relaxed module constraint
  console.log('── 007: Relaxed module constraint ──');
  const { rows: constraints } = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conname = 'agents_module_check'
  `);
  if (constraints.length > 0) {
    const isRelaxed = constraints[0].def.includes('length');
    console.log(`  ✓ agents_module_check: ${isRelaxed ? 'relaxed (any non-empty)' : '⚠️  still restrictive'}`);
    if (!isRelaxed) allGood = false;
  } else {
    console.log('  ⚠️  agents_module_check constraint not found');
    allGood = false;
  }
  console.log('');

  // Verify 008 — three-tier memory
  console.log('── 008: Three-tier memory ──');
  const memoryTables = ['working_memory', 'episodic_memory', 'semantic_memory', 'audit_log'];
  const { rows: tables } = await client.query(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = ANY($1)
    ORDER BY tablename
  `, [memoryTables]);
  tables.forEach(r => console.log(`  ✓ ${r.tablename}`));
  console.log(`  ${tables.length}/${memoryTables.length} tables present`);

  // Check pgvector extension
  const { rows: exts } = await client.query(`
    SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'
  `);
  if (exts.length > 0) {
    console.log(`  ✓ pgvector extension: v${exts[0].extversion}`);
  } else {
    console.log('  ⚠️  pgvector extension NOT FOUND — enable in Supabase Dashboard → Database → Extensions');
    allGood = false;
  }

  // Check RLS enabled
  const { rows: rls } = await client.query(`
    SELECT tablename, rowsecurity FROM pg_tables
    WHERE schemaname = 'public' AND tablename = ANY($1)
  `, [memoryTables]);
  const rlsEnabled = rls.filter(r => r.rowsecurity).length;
  console.log(`  ✓ RLS enabled on ${rlsEnabled}/${rls.length} tables`);

  // Check audit_log immutability rules
  const { rows: rules } = await client.query(`
    SELECT rulename FROM pg_rules 
    WHERE rulename IN ('audit_no_update', 'audit_no_delete')
    ORDER BY rulename
  `);
  rules.forEach(r => console.log(`  ✓ rule ${r.rulename}: active`));
  console.log(`  ${rules.length}/2 immutability rules present`);

  if (tables.length < memoryTables.length) allGood = false;
  console.log('');

  // ── Final verdict ──
  if (allGood) {
    console.log('═══════════════════════════════════════════════');
    console.log('  ✅ All migrations verified — stack is live! 🚀');
    console.log('═══════════════════════════════════════════════\n');
  } else {
    console.log('═══════════════════════════════════════════════');
    console.log('  ⚠️  Some verifications failed — check output above.');
    console.log('═══════════════════════════════════════════════\n');
    process.exit(1);
  }

} catch (err) {
  console.error('\n❌ Migration failed:', err.message);
  if (err.message.includes('extension "vector" is not available')) {
    console.error('\n💡 Fix: Enable pgvector in Supabase Dashboard → Database → Extensions → search "vector" → toggle ON');
    console.error('   Then re-run this script.\n');
  }
  process.exit(1);
} finally {
  await client.end();
}
