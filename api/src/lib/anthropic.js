/**
 * Anthropic client factory.
 *
 * Resolves the API key in this order:
 *   1. org.anthropic_api_key  (BYOK — per-org)
 *   2. process.env.ANTHROPIC_API_KEY  (platform-wide fallback)
 *
 * Throws when neither is available so callers can surface a clear 4xx.
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../middleware/db.js';

export const MODELS = {
  fast: 'claude-haiku-4-5',
  smart: 'claude-sonnet-4-6',
};

const PLATFORM_KEY = process.env.ANTHROPIC_API_KEY || '';

const clientCache = new Map();

export function getAnthropic(org) {
  const key = org?.anthropic_api_key || PLATFORM_KEY;
  if (!key) {
    const err = new Error('No Anthropic API key configured for this organization');
    err.code = 'NO_ANTHROPIC_KEY';
    throw err;
  }
  if (clientCache.has(key)) return clientCache.get(key);
  const client = new Anthropic({ apiKey: key });
  clientCache.set(key, client);
  return client;
}

export function hasAnthropic(org) {
  return Boolean(org?.anthropic_api_key || PLATFORM_KEY);
}

async function logUsage(orgId, endpoint, response) {
  if (!supabase || !orgId) return;
  const u = response.usage || {};
  await supabase.from('anthropic_usage').insert({
    org_id: orgId,
    endpoint,
    model: response.model,
    input_tokens: u.input_tokens || 0,
    output_tokens: u.output_tokens || 0,
    cache_read_tokens: u.cache_read_input_tokens || 0,
    cache_creation_tokens: u.cache_creation_input_tokens || 0,
  }).then(() => {}, (err) => console.warn('usage log failed:', err.message));
}

/**
 * One-shot Claude call with sensible defaults and auto-caching of the system
 * prompt. Use `model: 'fast'` (Haiku) or `model: 'smart'` (Sonnet).
 *
 * Pass `endpoint` to attribute the call in the anthropic_usage table.
 */
export async function complete(org, { model = 'fast', system, messages, maxTokens = 2048, thinking, endpoint = 'unknown' }) {
  const client = getAnthropic(org);
  const modelId = MODELS[model] || model;

  const params = {
    model: modelId,
    max_tokens: maxTokens,
    system,
    messages,
    cache_control: { type: 'ephemeral' },
  };

  if (thinking && modelId === MODELS.smart) {
    params.thinking = { type: 'adaptive' };
  }

  const response = await client.messages.create(params);

  logUsage(org?.id, endpoint, response);

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  return {
    text,
    model: response.model,
    usage: response.usage,
    stop_reason: response.stop_reason,
  };
}
