/**
 * @stoic/agentos-sdk/openclaw
 *
 * OpenClaw adapter — one-liner integration for local OpenClaw skills with the
 * Stoic AgentOS cloud brain. Wrap a skill's entry function and every invocation
 * is registered, observed, and heartbeat-logged on the dashboard.
 *
 *   import { logSkill, observe } from 'stoic-agentos-sdk/openclaw';
 *
 *   export default logSkill('outreach', async (ctx) => {
 *     await observe({ type: 'decision', title: 'Sequenced 50 leads via LinkedIn' });
 *     // ... skill body
 *   });
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { AgentOS } from './index.js';

// Mirrors the 6 modules in openclaw.json. Maps each of the 25 skills to its
// AgentOS module column so the dashboard groups them correctly out of the box.
export const SKILL_MODULE_MAP = {
  // Content
  'auto-calendar': 'content',
  'wire-telegram': 'content',
  'n8n-orchestrator': 'content',
  'stoicbot': 'content',
  // GTM
  'linkedin-scraper': 'gtm',
  'ad-generator': 'gtm',
  'ad-spy': 'gtm',
  'seo-factory': 'gtm',
  'newsfeed': 'gtm',
  'viralizer': 'gtm',
  // CRM
  'outreach': 'crm',
  'reply-tracker': 'crm',
  'dialer': 'crm',
  // Financial
  'fincfo': 'finance',
  'ledger': 'finance',
  'watchdog': 'finance',
  'taxbot': 'finance',
  'dunning': 'finance',
  'forecast': 'finance',
  'recon': 'finance',
  'cashflow': 'finance',
  // Trading
  'trading-ea': 'standalone',
  // Utility
  'memory-bridge': 'standalone',
  'command-center': 'standalone',
};

const DEFAULT_CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json');

let _client = null;

function loadOpenclawConfig(path = process.env.OPENCLAW_CONFIG || DEFAULT_CONFIG_PATH) {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return {};
  }
}

export function init(options = {}) {
  const config = loadOpenclawConfig();
  const apiKey =
    options.apiKey ||
    process.env.AGENTOS_API_KEY ||
    config?.agentos?.api_key ||
    config?.observability?.agentos_api_key ||
    '';
  const workspace =
    options.workspace ||
    process.env.AGENTOS_WORKSPACE ||
    config?.agentos?.workspace ||
    config?.workspace ||
    'openclaw-local';

  _client = new AgentOS({
    apiKey,
    workspace,
    debug: options.debug ?? !!process.env.OPENCLAW_DEBUG,
  });
  return _client;
}

export function getClient() {
  if (!_client) init();
  return _client;
}

export function logSkill(skillName, fn, options = {}) {
  const module = options.module || SKILL_MODULE_MAP[skillName] || 'standalone';
  let registered = false;

  return async function executeSkill(...args) {
    const sdk = getClient();
    const startTime = Date.now();

    if (!registered) {
      await sdk.registerAgent({
        name: skillName,
        description: options.description || `OpenClaw skill: ${skillName}`,
        module,
      }).catch(() => {});
      registered = true;
    }

    await sdk.capture({
      type: 'agent_run',
      title: `[${skillName}] Started`,
      agent: skillName,
      metadata: { event: 'start', source: 'openclaw', module },
    });

    try {
      const result = await fn.apply(this, args);
      const durationMs = Date.now() - startTime;

      await sdk.capture({
        type: 'agent_run',
        title: `[${skillName}] Success (${durationMs}ms)`,
        agent: skillName,
        metadata: { event: 'success', source: 'openclaw', module, duration_ms: durationMs },
      });

      await sdk._send('/agents/heartbeat', {
        name: skillName,
        status: 'success',
        module,
      }).catch(() => {});

      // Skills typically run to completion in a short-lived process — flush now
      // so observations land before the runtime exits.
      await sdk.flush();
      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      await sdk.capture({
        type: 'error',
        title: `[${skillName}] Error: ${error.message}`,
        content: error.stack || error.message,
        agent: skillName,
        metadata: {
          event: 'error',
          source: 'openclaw',
          module,
          duration_ms: durationMs,
          error_name: error.name,
        },
      });

      await sdk._send('/agents/heartbeat', {
        name: skillName,
        status: 'error',
        module,
      }).catch(() => {});

      await sdk.flush();
      throw error;
    }
  };
}

export async function observe(observation) {
  return getClient().capture(observation);
}

export async function rememberKnowledge({ name, summary, content, artifacts }) {
  return getClient()._send('/knowledge-items', {
    name,
    summary: summary || '',
    content: content || '',
    artifacts: artifacts || [],
  });
}

export async function recallKnowledge(query = '') {
  const params = query ? `?q=${encodeURIComponent(query)}` : '';
  return getClient()._fetch(`/knowledge-items${params}`);
}

export async function registerAllSkills(extra = []) {
  const sdk = getClient();
  const skills = [
    ...Object.entries(SKILL_MODULE_MAP),
    ...extra.map((s) => [s.name, s.module || 'standalone']),
  ];
  return Promise.allSettled(
    skills.map(([name, module]) =>
      sdk.registerAgent({
        name,
        description: `OpenClaw skill: ${name}`,
        module,
      })
    )
  );
}
