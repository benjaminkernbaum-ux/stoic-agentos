#!/usr/bin/env node
/**
 * register-agents.js — One-shot agent registration for the Stoic ecosystem
 * Registers all 23 agents + infrastructure agents via the AgentOS API.
 *
 * Usage: node register-agents.js
 * Env:   AGENTOS_API_KEY, AGENTOS_API_URL
 */

const API_URL = process.env.AGENTOS_API_URL || 'https://agent-ops-production.up.railway.app/api/v1';
const API_KEY = process.env.AGENTOS_API_KEY || '';

if (!API_KEY) {
  console.error('❌ AGENTOS_API_KEY not set. Export it first.');
  process.exit(1);
}

async function heartbeat(name, module, description, status = 'idle') {
  try {
    const res = await fetch(`${API_URL}/agents/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ name, module, description, status }),
    });
    const data = await res.json();
    const action = data.created ? '✅ Registered' : '🔄 Updated';
    console.log(`  ${action}: ${name} [${module}]`);
    return data;
  } catch (err) {
    console.error(`  ❌ Failed: ${name} — ${err.message}`);
  }
}

const AGENTS = [
  // ── Content Production ──────────────────────────────────────────────────
  { name: 'AUTO', module: 'content', description: 'Cinematic content calendar — LuzDaPalavra biblical video pipeline (Cron 09:00 + 20:00 BRT)', status: 'idle' },
  { name: 'WIRE', module: 'content', description: 'Telegram post publisher — distributes AUTO output to channels', status: 'idle' },
  { name: 'N8N', module: 'content', description: 'n8n orchestrator — cron + webhook automation hub on Railway', status: 'running' },
  { name: 'STOICBOT', module: 'content', description: '24/7 Stoic content bot on Railway — 10 scheduled posts/day, 34 endpoints', status: 'running' },

  // ── GTM Pipeline ─────────────────────────────────────────────────────────
  { name: 'SCRAPE', module: 'gtm', description: 'LinkedIn scraper — PhantomBuster + Apollo enrichment (manual CLI)', status: 'idle' },
  { name: 'ADGEN', module: 'gtm', description: 'Ad generator — Perplexity + Claude → Facebook/Meta campaigns', status: 'idle' },
  { name: 'ADSPY', module: 'gtm', description: 'Competitor ad spy — FB Ad Library scraper + Claude rewriter', status: 'idle' },
  { name: 'SEOFACTORY', module: 'gtm', description: 'SEO content factory — deep-research → 2000+ word articles', status: 'idle' },
  { name: 'NEWSFEED', module: 'gtm', description: 'Newsletter agent — Google News scan → Claude → Instantly email (Cron 08:00)', status: 'idle' },
  { name: 'VIRALIZER', module: 'gtm', description: 'Viral multiplier — topics → Reels, threads, carousels via Claude', status: 'idle' },

  // ── CRM Outreach ─────────────────────────────────────────────────────────
  { name: 'OUTREACH', module: 'crm', description: 'WhatsApp outreach scheduler — scheduled bulk messaging', status: 'idle' },
  { name: 'REPLY', module: 'crm', description: 'WhatsApp reply handler — GPT-4o auto-responses to inbound messages', status: 'idle' },
  { name: 'DIALER', module: 'crm', description: 'Email dialer — Outlook SMTP rotation for cold email campaigns', status: 'idle' },

  // ── Financial Department ─────────────────────────────────────────────────
  { name: 'FINCFO', module: 'finance', description: 'Daily CFO briefing — Stripe + ChartMogul → Claude Sonnet → Telegram (07:00)', status: 'idle' },
  { name: 'LEDGER', module: 'finance', description: 'Nightly bookkeeper — Stripe charges → Claude Haiku → Google Sheets (23:00)', status: 'idle' },
  { name: 'FORECAST', module: 'finance', description: 'Weekly scenario modeling — ChartMogul → Claude Sonnet base/bear/bull (Mon 08:00)', status: 'idle' },
  { name: 'TAXBOT', module: 'finance', description: 'Tax calculator — DAS + ISS (Simples Nacional Anexo III) on 5th monthly', status: 'idle' },
  { name: 'RECON', module: 'finance', description: '3-way revenue reconciliation — Stripe + ChartMogul + Sheets (1st monthly)', status: 'idle' },
  { name: 'DUNNING', module: 'finance', description: 'Failed payment recovery — Stripe webhook → auto-retry + customer email', status: 'running' },
  { name: 'WATCHDOG', module: 'finance', description: 'Risk scanner — deterministic Stripe anomaly detection (06:45 daily, no LLM)', status: 'idle' },
  { name: 'CASHFLOW', module: 'finance', description: 'Cash position tracker — Stripe + Wise daily treasury (08:00)', status: 'idle' },

  // ── Standalone ───────────────────────────────────────────────────────────
  { name: 'LW-EA', module: 'standalone', description: 'MetaTrader 5 Expert Advisor — MQL5 auto-trading on NAS100/indices', status: 'running' },
  { name: 'LENS', module: 'standalone', description: 'FishFinder vision agent — TF Lite species identification (planned)', status: 'idle' },

  // ── Infrastructure Agents (Nouveau dossier) ──────────────────────────────
  { name: 'INFRA-AGENT-1', module: 'standalone', description: 'Infrastructure Agent 1 — GitHub + Railway + Supabase ops specialist (Nouveau dossier)', status: 'idle' },
  { name: 'INFRA-AGENT-2', module: 'standalone', description: 'Infrastructure Agent 2 — Cloud operations & deployment orchestrator (Nouveau dossier)', status: 'idle' },
];

async function main() {
  console.log(`\n⚡ Stoic AgentOS — Agent Registration`);
  console.log(`   API: ${API_URL}`);
  console.log(`   Registering ${AGENTS.length} agents...\n`);

  console.log('📦 Content Production:');
  for (const a of AGENTS.filter(a => a.module === 'content')) await heartbeat(a.name, a.module, a.description, a.status);

  console.log('\n🎯 GTM Pipeline:');
  for (const a of AGENTS.filter(a => a.module === 'gtm')) await heartbeat(a.name, a.module, a.description, a.status);

  console.log('\n📞 CRM Outreach:');
  for (const a of AGENTS.filter(a => a.module === 'crm')) await heartbeat(a.name, a.module, a.description, a.status);

  console.log('\n💰 Financial Department:');
  for (const a of AGENTS.filter(a => a.module === 'finance')) await heartbeat(a.name, a.module, a.description, a.status);

  console.log('\n🔧 Standalone + Infrastructure:');
  for (const a of AGENTS.filter(a => a.module === 'standalone')) await heartbeat(a.name, a.module, a.description, a.status);

  console.log(`\n✅ Done — ${AGENTS.length} agents registered in AgentOS platform.\n`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
