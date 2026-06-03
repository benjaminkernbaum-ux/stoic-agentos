import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase BEFORE importing the module under test
const rpcMock = vi.fn();
vi.mock('./../middleware/db.js', () => ({
  supabase: { rpc: rpcMock, from: vi.fn() },
}));

// Stub the Anthropic SDK so we never actually hit the network
const createMock = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  // Must use a function expression (not arrow) so it can be called with `new`
  const MockAnthropic = vi.fn().mockImplementation(function (this: any, { apiKey }: { apiKey: string }) {
    this.apiKey = apiKey;
    this.messages = { create: createMock };
  });
  return { default: MockAnthropic };
});

describe('anthropic.js', () => {
  let mod: any;

  beforeEach(async () => {
    rpcMock.mockReset();
    createMock.mockReset();
    delete process.env.ANTHROPIC_API_KEY;
    vi.resetModules();
    mod = await import('./anthropic.js');
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('MODELS', () => {
    it('maps fast to Haiku 4.5 and smart to Sonnet 4.6', () => {
      expect(mod.MODELS.fast).toBe('claude-haiku-4-5-20251001');
      expect(mod.MODELS.smart).toBe('claude-sonnet-4-6');
    });
  });

  describe('hasAnthropic', () => {
    it('returns true when the org has a vault key id', () => {
      expect(mod.hasAnthropic({ anthropic_key_vault_id: 'vault-uuid' })).toBe(true);
    });

    it('returns true when the platform key is set, even without an org key', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-platform';
      vi.resetModules();
      mod = await import('./anthropic.js');
      expect(mod.hasAnthropic({})).toBe(true);
    });

    it('returns false when neither org nor platform has a key', () => {
      expect(mod.hasAnthropic({})).toBe(false);
      expect(mod.hasAnthropic(null)).toBe(false);
    });
  });

  describe('getAnthropic', () => {
    it('decrypts the org vault key when present', async () => {
      rpcMock.mockResolvedValueOnce({ data: 'sk-ant-org-key', error: null });
      const client = await mod.getAnthropic({ id: 'org-1', anthropic_key_vault_id: 'vault-1' });
      expect(client.apiKey).toBe('sk-ant-org-key');
      expect(rpcMock).toHaveBeenCalledWith('get_org_anthropic_key', { p_org_id: 'org-1' });
    });

    it('falls back to the platform key when the org has no vault entry', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-platform';
      vi.resetModules();
      mod = await import('./anthropic.js');
      const client = await mod.getAnthropic({ id: 'org-1' });
      expect(client.apiKey).toBe('sk-ant-platform');
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it('throws NO_ANTHROPIC_KEY when nothing is configured', async () => {
      await expect(mod.getAnthropic({})).rejects.toMatchObject({ code: 'NO_ANTHROPIC_KEY' });
    });

    it('caches the decrypted key for repeat calls (TTL cache)', async () => {
      rpcMock.mockResolvedValueOnce({ data: 'sk-ant-cached', error: null });

      await mod.getAnthropic({ id: 'org-1', anthropic_key_vault_id: 'vault-1' });
      await mod.getAnthropic({ id: 'org-1', anthropic_key_vault_id: 'vault-1' });
      await mod.getAnthropic({ id: 'org-1', anthropic_key_vault_id: 'vault-1' });

      expect(rpcMock).toHaveBeenCalledTimes(1);
    });

    it('invalidateOrgKeyCache forces a re-fetch on the next call', async () => {
      rpcMock
        .mockResolvedValueOnce({ data: 'sk-ant-v1', error: null })
        .mockResolvedValueOnce({ data: 'sk-ant-v2', error: null });

      const client1 = await mod.getAnthropic({ id: 'org-1', anthropic_key_vault_id: 'v' });
      mod.invalidateOrgKeyCache('org-1');
      const client2 = await mod.getAnthropic({ id: 'org-1', anthropic_key_vault_id: 'v' });

      expect(client1.apiKey).toBe('sk-ant-v1');
      expect(client2.apiKey).toBe('sk-ant-v2');
      expect(rpcMock).toHaveBeenCalledTimes(2);
    });

    it('reuses the same Anthropic instance for the same key', async () => {
      rpcMock.mockResolvedValue({ data: 'sk-ant-same', error: null });
      const c1 = await mod.getAnthropic({ id: 'org-1', anthropic_key_vault_id: 'v' });
      const c2 = await mod.getAnthropic({ id: 'org-1', anthropic_key_vault_id: 'v' });
      expect(c1).toBe(c2);
    });
  });

  describe('graceful degradation when migration_003 is pending', () => {
    it('isVaultMigrationError detects PG code 42883', () => {
      expect(mod.isVaultMigrationError({ code: '42883', message: 'whatever' })).toBe(true);
    });

    it('isVaultMigrationError sniffs the "function does not exist" message as fallback', () => {
      expect(mod.isVaultMigrationError({ message: 'function get_org_anthropic_key(uuid) does not exist' })).toBe(true);
    });

    it('isVaultMigrationError returns false for unrelated errors', () => {
      expect(mod.isVaultMigrationError({ code: '23505', message: 'duplicate key' })).toBe(false);
      expect(mod.isVaultMigrationError(null)).toBe(false);
    });

    it('getAnthropic falls back to platform key when the RPC is missing', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-fallback';
      vi.resetModules();
      mod = await import('./anthropic.js');

      rpcMock.mockResolvedValueOnce({
        data: null,
        error: { code: '42883', message: 'function get_org_anthropic_key(uuid) does not exist' },
      });

      const client = await mod.getAnthropic({ id: 'org-1', anthropic_key_vault_id: 'v' });
      expect(client.apiKey).toBe('sk-ant-fallback');
      expect(mod.vaultStatus()).toBe('pending');
    });

    it('short-circuits the RPC on subsequent calls once it knows migration is pending', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-fallback';
      vi.resetModules();
      mod = await import('./anthropic.js');

      rpcMock.mockResolvedValueOnce({
        data: null,
        error: { code: '42883', message: 'function does not exist' },
      });

      await mod.getAnthropic({ id: 'org-1', anthropic_key_vault_id: 'v' });
      await mod.getAnthropic({ id: 'org-2', anthropic_key_vault_id: 'w' });
      await mod.getAnthropic({ id: 'org-3', anthropic_key_vault_id: 'x' });

      // Only the first call probes the RPC; the rest short-circuit on vaultRpcAvailable=false
      expect(rpcMock).toHaveBeenCalledTimes(1);
    });

    it('probeVaultRpc returns "ready" when the RPC responds', async () => {
      rpcMock.mockResolvedValueOnce({ data: null, error: null });
      const status = await mod.probeVaultRpc();
      expect(status).toBe('ready');
      expect(mod.vaultStatus()).toBe('ready');
    });

    it('probeVaultRpc returns "pending" on a missing-RPC error', async () => {
      rpcMock.mockResolvedValueOnce({
        data: null,
        error: { code: '42883', message: 'function does not exist' },
      });
      const status = await mod.probeVaultRpc();
      expect(status).toBe('pending');
    });

    it('probeVaultRpc returns "unknown" on transport errors (does not toggle state)', async () => {
      rpcMock.mockResolvedValueOnce({
        data: null,
        error: { code: '08006', message: 'connection failed' },
      });
      const status = await mod.probeVaultRpc();
      expect(status).toBe('unknown');
      expect(mod.vaultStatus()).toBe('unknown');
    });
  });

  describe('complete', () => {
    it('uses the requested model and passes through messages', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-platform';
      vi.resetModules();
      mod = await import('./anthropic.js');

      createMock.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'hello world' }],
        model: 'claude-haiku-4-5-20251001',
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      const result = await mod.complete({}, {
        model: 'fast',
        system: 'be helpful',
        messages: [{ role: 'user', content: 'hi' }],
        endpoint: 'test',
      });

      expect(result.text).toBe('hello world');
      expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
        model: 'claude-haiku-4-5-20251001',
      }));
    });

    it('only enables thinking on the smart (Sonnet) model', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-platform';
      vi.resetModules();
      mod = await import('./anthropic.js');

      createMock.mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
        model: 'claude-3-5-sonnet-20241022',
        usage: {},
        stop_reason: 'end_turn',
      });

      await mod.complete({}, { model: 'fast', system: '', messages: [], thinking: true, endpoint: 't' });
      expect(createMock.mock.calls[0][0].thinking).toBeUndefined();

      await mod.complete({}, { model: 'smart', system: '', messages: [], thinking: true, endpoint: 't' });
      expect(createMock.mock.calls[1][0].thinking).toEqual({ type: 'adaptive' });
    });

    it('concatenates multiple text blocks into result.text', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-platform';
      vi.resetModules();
      mod = await import('./anthropic.js');

      createMock.mockResolvedValueOnce({
        content: [
          { type: 'thinking', thinking: 'reasoning...' },
          { type: 'text', text: 'first' },
          { type: 'text', text: 'second' },
        ],
        model: 'claude-3-5-sonnet-20241022',
        usage: {},
        stop_reason: 'end_turn',
      });

      const result = await mod.complete({}, { model: 'smart', system: '', messages: [], endpoint: 't' });
      expect(result.text).toBe('first\nsecond');
    });
  });
});
