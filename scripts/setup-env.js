#!/usr/bin/env node
/**
 * Interactive setup CLI: writes .env from .env.example with the credentials
 * you provide. Run with: `npm run setup`.
 *
 * Zero deps — Node stdlib only (readline, fs, path). Non-interactive stdin
 * (CI, pipes) falls through with defaults instead of hanging.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { stdin, stdout } from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const TEMPLATE = resolve(REPO_ROOT, '.env.example');
const TARGET = resolve(REPO_ROOT, '.env');

// Prompts asked in order. `sensitive` masks values in the summary at the end.
const PROMPTS = [
  { key: 'VITE_SUPABASE_URL', label: 'Supabase URL', hint: 'https://xxx.supabase.co' },
  { key: 'VITE_SUPABASE_ANON_KEY', label: 'Supabase anon key', sensitive: true },
  { key: 'SUPABASE_SERVICE_KEY', label: 'Supabase service role key (server)', sensitive: true },
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API key (optional)', sensitive: true, optional: true },
  { key: 'STRIPE_SECRET_KEY', label: 'Stripe secret key (optional)', sensitive: true, optional: true },
  { key: 'STRIPE_WEBHOOK_SECRET', label: 'Stripe webhook secret (optional)', sensitive: true, optional: true },
];

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function mask(v) {
  if (!v) return '';
  if (v.length <= 8) return '*'.repeat(v.length);
  return `${v.slice(0, 4)}${'*'.repeat(Math.min(v.length - 8, 12))}${v.slice(-4)}`;
}

function replaceOrAppend(source, key, value) {
  // Replace `KEY=...` in-place if present (comments preserved), else append.
  const line = `${key}=${value}`;
  const rx = new RegExp(`^${key}=.*$`, 'm');
  if (rx.test(source)) return source.replace(rx, line);
  return `${source.trimEnd()}\n${line}\n`;
}

async function main() {
  if (!existsSync(TEMPLATE)) {
    console.error(`${c.red}✗ .env.example not found at ${TEMPLATE}${c.reset}`);
    process.exit(1);
  }

  const rl = createInterface({ input: stdin, output: stdout });
  const ask = async (q, def = '') => {
    const suffix = def ? ` ${c.dim}[${def}]${c.reset}` : '';
    const answer = (await rl.question(`${q}${suffix} `)).trim();
    return answer || def;
  };

  console.log(`${c.bold}${c.cyan}⚡ Stoic AgentOS — Environment Setup${c.reset}\n`);

  if (existsSync(TARGET)) {
    const overwrite = await ask(`${c.yellow}.env already exists. Overwrite?${c.reset} (y/N)`, 'N');
    if (!/^y(es)?$/i.test(overwrite)) {
      console.log(`${c.dim}Aborted — kept existing .env.${c.reset}`);
      rl.close();
      return;
    }
  }

  console.log(`${c.dim}Press Enter to skip optional fields.${c.reset}\n`);

  const answers = {};
  for (const p of PROMPTS) {
    const label = `${p.label}${p.hint ? c.dim + ' (' + p.hint + ')' + c.reset : ''}`;
    const value = await ask(`  ${c.bold}›${c.reset} ${label}:`);
    if (value) answers[p.key] = value;
    else if (!p.optional) {
      console.log(`    ${c.yellow}⚠ left blank — you'll need to fill this before running the app${c.reset}`);
    }
  }

  rl.close();

  // Build the new .env from the template so structure/comments are preserved.
  let contents = readFileSync(TEMPLATE, 'utf8');
  for (const [key, value] of Object.entries(answers)) {
    contents = replaceOrAppend(contents, key, value);
  }
  writeFileSync(TARGET, contents, 'utf8');

  console.log(`\n${c.green}✓ Wrote ${TARGET}${c.reset}`);
  const filled = Object.entries(answers).filter(([, v]) => v);
  if (filled.length > 0) {
    console.log(`${c.dim}Filled:${c.reset}`);
    for (const [key, value] of filled) {
      const prompt = PROMPTS.find(p => p.key === key);
      const display = prompt?.sensitive ? mask(value) : value;
      console.log(`  ${c.dim}${key}=${c.reset}${display}`);
    }
  }
  console.log(`\n${c.dim}Next: ${c.reset}${c.bold}npm run dev${c.reset}`);
}

main().catch((err) => {
  console.error(`${c.red}✗ ${err.message}${c.reset}`);
  process.exit(1);
});
