#!/usr/bin/env node
/**
 * AgentOS CLI
 * Usage:
 *   npx stoic-agentos-sdk init         — Initialize AgentOS in current project
 *   npx stoic-agentos-sdk init-hooks   — Install git post-commit hooks
 *   npx stoic-agentos-sdk instrument   — Check instrumentation setup
 *   npx stoic-agentos-sdk test         — Test API connection
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const COMMANDS = {
  init: initProject,
  'init-hooks': initGitHooks,
  instrument: checkInstrumentation,
  test: testConnection,
  help: showHelp,
};

const cmd = process.argv[2] || 'help';
const handler = COMMANDS[cmd] || showHelp;
handler();

function initProject() {
  console.log('\n⚡ Stoic AgentOS — Project Initialization\n');

  const apiKey = process.argv[3] || process.env.AGENTOS_API_KEY || '';
  const workspace = process.argv[4] || getRepoName() || 'my-project';

  // Create .agentos config
  const config = {
    api_key: apiKey,
    workspace: workspace,
    api_url: 'https://api.stoicagentos.com/api/v1',
    auto_capture: true,
    git_hooks: true,
    instrument: {
      openai: true,
      anthropic: true,
      capturePrompts: false,
    },
  };

  writeFileSync('.agentos.json', JSON.stringify(config, null, 2));
  console.log('  ✅ Created .agentos.json');

  // Add to .gitignore
  const gitignore = existsSync('.gitignore') ? readFileSync('.gitignore', 'utf-8') : '';
  if (!gitignore.includes('.agentos.json')) {
    writeFileSync('.gitignore', gitignore + '\n# AgentOS\n.agentos.json\n');
    console.log('  ✅ Added .agentos.json to .gitignore');
  }

  // Install hooks if git repo
  if (existsSync('.git')) {
    initGitHooks();
  }

  console.log(`\n  🎉 AgentOS initialized for workspace: ${workspace}`);
  console.log('  Run your agents — observations will auto-capture.\n');
  console.log('  📊 Auto-Instrumentation:');
  console.log('     Add this to your entry file:\n');
  console.log('     import { AgentOS } from "stoic-agentos-sdk";');
  console.log('     import OpenAI from "openai";');
  console.log('     const os = new AgentOS({ apiKey: "YOUR_KEY" });');
  console.log('     const openai = new OpenAI();');
  console.log('     os.instrumentClient("openai", openai);\n');
}

function initGitHooks() {
  const hooksDir = join('.git', 'hooks');
  if (!existsSync('.git')) {
    console.log('  ⚠️  Not a git repository. Run git init first.');
    return;
  }

  mkdirSync(hooksDir, { recursive: true });

  const hookScript = `#!/bin/sh
# AgentOS — Auto-capture git commits
# Installed by: npx stoic-agentos-sdk init-hooks

if [ -f .agentos.json ]; then
  API_KEY=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.agentos.json','utf-8')).api_key || '')" 2>/dev/null)
  WORKSPACE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.agentos.json','utf-8')).workspace || '')" 2>/dev/null)
  REPO=$(basename "$(git rev-parse --show-toplevel)")
  HASH=$(git rev-parse HEAD)
  MSG=$(git log -1 --pretty=%B)
  BRANCH=$(git branch --show-current)
  AUTHOR=$(git log -1 --pretty=%an)

  if [ -n "$API_KEY" ]; then
    curl -s -X POST "https://api.stoicagentos.com/api/v1/webhooks/git" \\
      -H "Content-Type: application/json" \\
      -d "{\\"api_key\\":\\"$API_KEY\\",\\"repo\\":\\"$REPO\\",\\"branch\\":\\"$BRANCH\\",\\"commit_hash\\":\\"$HASH\\",\\"commit_message\\":\\"$MSG\\",\\"author\\":\\"$AUTHOR\\"}" \\
      > /dev/null 2>&1 &
  fi
fi
`;

  const hookPath = join(hooksDir, 'post-commit');
  writeFileSync(hookPath, hookScript, { mode: 0o755 });
  console.log('  ✅ Git post-commit hook installed');
}

function checkInstrumentation() {
  console.log('\n⚡ Stoic AgentOS — Instrumentation Check\n');

  // Check for OpenAI
  let hasOpenAI = false;
  try {
    require.resolve('openai');
    hasOpenAI = true;
  } catch {
    // Not installed
  }

  // Check for Anthropic
  let hasAnthropic = false;
  try {
    require.resolve('@anthropic-ai/sdk');
    hasAnthropic = true;
  } catch {
    // Not installed
  }

  console.log('  SDK Detection:');
  console.log(`    ${hasOpenAI ? '✅' : '⬚'}  OpenAI     ${hasOpenAI ? '(installed — will auto-instrument)' : '(not found)'}`);
  console.log(`    ${hasAnthropic ? '✅' : '⬚'}  Anthropic  ${hasAnthropic ? '(installed — will auto-instrument)' : '(not found)'}`);

  if (!hasOpenAI && !hasAnthropic) {
    console.log('\n  ⚠️  No supported LLM SDKs detected.');
    console.log('  Install one of:');
    console.log('    npm install openai');
    console.log('    npm install @anthropic-ai/sdk\n');
    return;
  }

  console.log('\n  📊 Setup (add to your entry file):\n');
  console.log('  import { AgentOS } from "stoic-agentos-sdk";');
  console.log('  import OpenAI from "openai";');
  console.log('  const os = new AgentOS({ apiKey: process.env.AGENTOS_API_KEY });');
  console.log('  const openai = new OpenAI();');
  console.log('  os.instrumentClient("openai", openai);\n');
  console.log('  // All LLM calls are now auto-captured! 🚀');

  if (hasOpenAI) {
    console.log('\n  OpenAI example:');
    console.log('  ─────────────────────────────────────');
    console.log('  import OpenAI from "openai";');
    console.log('  const openai = new OpenAI();');
    console.log('  const res = await openai.chat.completions.create({');
    console.log('    model: "gpt-4o",');
    console.log('    messages: [{ role: "user", content: "Hello" }],');
    console.log('  });');
    console.log('  // ↑ Automatically captured: model, tokens, latency, cost');
  }

  if (hasAnthropic) {
    console.log('\n  Anthropic example:');
    console.log('  ─────────────────────────────────────');
    console.log('  import Anthropic from "@anthropic-ai/sdk";');
    console.log('  const anthropic = new Anthropic();');
    console.log('  const res = await anthropic.messages.create({');
    console.log('    model: "claude-sonnet-4-20250514",');
    console.log('    max_tokens: 1024,');
    console.log('    messages: [{ role: "user", content: "Hello" }],');
    console.log('  });');
    console.log('  // ↑ Automatically captured: model, tokens, latency, cost');
  }

  console.log('');
}

function testConnection() {
  console.log('\n⚡ Testing AgentOS connection...\n');

  let apiKey = process.env.AGENTOS_API_KEY;
  if (!apiKey && existsSync('.agentos.json')) {
    const config = JSON.parse(readFileSync('.agentos.json', 'utf-8'));
    apiKey = config.api_key;
  }

  if (!apiKey) {
    console.log('  ❌ No API key found. Set AGENTOS_API_KEY or run: npx agentos init <YOUR_API_KEY>');
    return;
  }

  fetch('https://api.stoicagentos.com/api/v1/stats', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
    .then(r => r.json())
    .then(data => {
      console.log('  ✅ Connected!');
      console.log(`  Plan: ${data.plan}`);
      console.log(`  Agents: ${data.agents?.current || 0}`);
      console.log(`  Observations this month: ${data.observations?.this_month || 0}`);
    })
    .catch(() => {
      console.log('  ❌ Connection failed. Check your API key and network.');
    });
}

function showHelp() {
  console.log(`
⚡ Stoic AgentOS CLI v3.0.0

Commands:
  init [API_KEY] [WORKSPACE]  — Initialize AgentOS in current project
  init-hooks                  — Install git post-commit hooks
  instrument                  — Check LLM SDK instrumentation setup
  test                        — Test API connection
  help                        — Show this message

Auto-Instrumentation:
  Supported SDKs: OpenAI, Anthropic
  Per-client setup: os.instrumentClient('openai', openaiClient) — patches LLM calls automatically

Environment:
  AGENTOS_API_KEY             — Your API key (from stoicagentos.com/settings)
  AGENTOS_API_URL             — Custom API URL (default: production)

Website: https://stoicagentos.com
Docs:    https://stoicagentos.com/docs
`);
}

function getRepoName() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim().split(/[\\/]/).pop();
  } catch {
    return null;
  }
}
