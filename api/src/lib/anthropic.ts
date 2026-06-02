/**
 * Anthropic client factory with Vault-backed BYOK.
 *
 * Key resolution (in order):
 *   1. org.anthropic_key_vault_id  — UUID into vault.secrets. Decrypted via the
 *      get_org_anthropic_key() RPC (service-role only).
 *   2. process.env.ANTHROPIC_API_KEY  — platform-wide fallback.
 *
 * Decrypted keys are cached in-process for 5min to avoid an RPC per Claude call.
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../middleware/db.js';
import type { Organization } from '../types.js';

interface AnthropicOrg {
  id?: string;
  anthropic_key_vault_id?: string;
}

interface CachedKey {
  key: string;
  expiresAt: number;
}

interface AnthropicError extends Error {
  code?: string;
  status?: number;
  headers?: Record<string, string>;
}

interface CompleteOptions {
  model?: string;
  system: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  thinking?: boolean;
  endpoint?: string;
}

interface CompleteResult {
  text: string;
  model: string;
  usage: Record<string, unknown>;
  stop_reason: string;
}

export const MODELS: Record<string, string> = {
  fast: 'claude-3-5-haiku-20241022',
  smart: 'claude-3-5-sonnet-20241022',
};

const PLATFORM_KEY = process.env.ANTHROPIC_API_KEY || '';
const KEY_TTL_MS = 5 * 60 * 1000;

// PostgreSQL "undefined_function" — raised when an RPC doesn't exist.
// Hit when migration_003 hasn't been applied yet on this Supabase project.
const PG_UNDEFINED_FUNCTION = '42883';

const clientCache = new Map<string, Anthropic>();      // api-key string -> Anthropic instance
const orgKeyCache = new Map<string, CachedKey>();      // org.id -> { key, expiresAt }
let vaultRpcAvailable: boolean | null = null;       // null=unknown, true=ready, false=migration_003 not run

export function invalidateOrgKeyCache(orgId: string): void {
  orgKeyCache.delete(orgId);
}

/**
 * @returns {'ready'|'pending'|'unknown'} — migration_003 status
 */
export function vaultStatus(): 'ready' | 'pending' | 'unknown' {
  if (vaultRpcAvailable === true) return 'ready';
  if (vaultRpcAvailable === false) return 'pending';
  return 'unknown';
}

function isMissingRpcError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  // supabase-js surfaces the PG code on .code; fall back to message sniff if absent.
  return error.code === PG_UNDEFINED_FUNCTION ||
         /function .* does not exist/i.test(error.message || '');
}

async function fetchOrgKeyFromVault(orgId: string): Promise<string | null> {
  const cached = orgKeyCache.get(orgId);
  if (cached && cached.expiresAt > Date.now()) return cached.key;
  if (!supabase) return null;
  if (vaultRpcAvailable === false) return null;  // short-circuit if we know it's not ready

  const { data, error } = await supabase.rpc('get_org_anthropic_key', { p_org_id: orgId });
  if (error) {
    if (isMissingRpcError(error)) {
      if (vaultRpcAvailable === null) {
        console.warn(
          '[anthropic] get_org_anthropic_key RPC not found — migration_003 has not been ' +
          'applied yet. BYOK is disabled until then; all callers will use the platform key.'
        );
      }
      vaultRpcAvailable = false;
      return null;
    }
    console.warn('vault key fetch failed:', error.message);
    return null;
  }
  vaultRpcAvailable = true;
  if (data) orgKeyCache.set(orgId, { key: data, expiresAt: Date.now() + KEY_TTL_MS });
  return data || null;
}

/**
 * One-shot RPC probe — call at server boot to surface migration status in logs
 * before any user traffic hits. Does not throw; just sets vaultRpcAvailable.
 */
export async function probeVaultRpc(): Promise<string> {
  if (!supabase) return 'no-supabase';
  // Use a known-bad UUID; if the RPC exists it returns null (no row), if it
  // doesn't exist we get a 42883.
  const { error } = await supabase.rpc('get_org_anthropic_key', {
    p_org_id: '00000000-0000-0000-0000-000000000000',
  });
  if (error && isMissingRpcError(error)) {
    vaultRpcAvailable = false;
    return 'pending';
  }
  if (error) {
    // Some other error (auth, network) — leave status unknown.
    return 'unknown';
  }
  vaultRpcAvailable = true;
  return 'ready';
}

/**
 * Exposed so the apiKeys route can map missing-RPC errors to a clean 503.
 */
export function isVaultMigrationError(error: { code?: string; message?: string }): boolean {
  return isMissingRpcError(error);
}

export async function getAnthropic(org: AnthropicOrg): Promise<Anthropic> {
  let key = '';

  if (org?.id && org?.anthropic_key_vault_id) {
    const vaultKey = await fetchOrgKeyFromVault(org.id);
    if (vaultKey) key = vaultKey;
  }

  if (!key) key = PLATFORM_KEY;

  if (!key) {
    const err: AnthropicError = new Error('No Anthropic API key configured for this organization');
    err.code = 'NO_ANTHROPIC_KEY';
    throw err;
  }

  if (clientCache.has(key)) return clientCache.get(key)!;
  const client = new Anthropic({ apiKey: key });
  clientCache.set(key, client);
  return client;
}

export function hasAnthropic(org: AnthropicOrg): boolean {
  // Sync — relies on the auth middleware having loaded org.* (including
  // anthropic_key_vault_id) onto req.org. Doesn't decrypt; just checks
  // whether any key path is configured.
  return Boolean(org?.anthropic_key_vault_id || PLATFORM_KEY);
}

async function logUsage(orgId: string | undefined, endpoint: string, response: Record<string, unknown>): Promise<void> {
  if (!supabase || !orgId) return;
  const u = (response.usage || {}) as Record<string, unknown>;
  await supabase.from('anthropic_usage').insert({
    org_id: orgId,
    endpoint,
    model: response.model,
    input_tokens: u.input_tokens || 0,
    output_tokens: u.output_tokens || 0,
    cache_read_tokens: u.cache_read_input_tokens || 0,
    cache_creation_tokens: u.cache_creation_input_tokens || 0,
  }).then(() => {}, (err: Error) => console.warn('usage log failed:', err.message));
}

/**
 * One-shot Claude call with sensible defaults and auto-caching of the system
 * prompt. Use `model: 'fast'` (Haiku) or `model: 'smart'` (Sonnet).
 *
 * Pass `endpoint` to attribute the call in the anthropic_usage table.
 */
export async function complete(org: AnthropicOrg, { model = 'fast', system, messages, maxTokens = 2048, thinking, endpoint = 'unknown' }: CompleteOptions): Promise<CompleteResult> {
  const client = await getAnthropic(org);
  const modelId = MODELS[model] || model;

  const params: Record<string, unknown> = {
    model: modelId,
    max_tokens: maxTokens,
    system,
    messages,
    cache_control: { type: 'ephemeral' },
  };

  if (thinking && modelId === MODELS.smart) {
    params.thinking = { type: 'adaptive' };
  }

  const response = await client.messages.create(params as any);

  logUsage(org?.id, endpoint, response as unknown as Record<string, unknown>);

  const text = ((response as any).content as Array<{ type: string; text?: string }>)
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  return {
    text,
    model: (response as any).model,
    usage: (response as any).usage as unknown as Record<string, unknown>,
    stop_reason: (response as any).stop_reason as string,
  };
}
