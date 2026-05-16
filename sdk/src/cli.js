#!/usr/bin/env node
/**
 * AgentOS CLI
 * Usage:
 *   npx stoic-agentos-sdk init         — Initialize AgentOS in current project
 *   npx stoic-agentos-sdk init-hooks   — Install git post-commit hooks
 *   npx stoic-agentos-sdk test         — Test API connection
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const COMMANDS = {
  init: initProject,
  'init-hooks': initGitHooks,
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
    api_url: 'https://stoic-agentos-api-production.up.railway.app/api/v1',
    auto_capture: true,
    git_hooks: true,
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
# Installed by: npx @stoic/agentos-sdk init-hooks

if [ -f .agentos.json ]; then
  API_KEY=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.agentos.json','utf-8')).api_key || '')" 2>/dev/null)
  WORKSPACE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.agentos.json','utf-8')).workspace || '')" 2>/dev/null)
  REPO=$(basename "$(git rev-parse --show-toplevel)")
  HASH=$(git rev-parse HEAD)
  MSG=$(git log -1 --pretty=%B)
  BRANCH=$(git branch --show-current)
  AUTHOR=$(git log -1 --pretty=%an)

  if [ -n "$API_KEY" ]; then
    curl -s -X POST "https://stoic-agentos-api-production.up.railway.app/api/v1/webhooks/git" \\
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

  fetch('https://stoic-agentos-api-production.up.railway.app/api/v1/stats', {
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
⚡ Stoic AgentOS CLI

Commands:
  init [API_KEY] [WORKSPACE]  — Initialize AgentOS in current project
  init-hooks                  — Install git post-commit hooks
  test                        — Test API connection
  help                        — Show this message

Environment:
  AGENTOS_API_KEY             — Your API key (from agentos.dev/settings)
  AGENTOS_API_URL             — Custom API URL (default: https://api.agentos.dev/api/v1)

Website: https://stoic-agentos.vercel.app
Docs:    https://stoic-agentos.vercel.app/docs
`);
}

function getRepoName() {
  try {
    const { execSync } = require('child_process');
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim().split(/[\\/]/).pop();
  } catch {
    return null;
  }
}
