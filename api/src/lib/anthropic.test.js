import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase BEFORE importing the module under test
const rpcMock = vi.fn();
vi.mock('./../middleware/db.js', () => ({
  supabase: { rpc: rpcMock, from: vi.fn() },
}));

// Stub the Anthropic SDK so we never actually hit the network
const createMock = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(({ apiKey }) => ({
    apiKey,
    messages: { create: createMock },
  })),
}));

describe('anthropic.js', () => {
  let mod;

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
      expect(mod.MODELS.fast).toBe('claude-haiku-4-5');
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

  describe('complete', () => {
    it('uses the requested model and passes through messages', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-platform';
      vi.resetModules();
      mod = await import('./anthropic.js');

      createMock.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'hello world' }],
        model: 'claude-haiku-4-5',
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
        model: 'claude-haiku-4-5',
        system: 'be helpful',
        cache_control: { type: 'ephemeral' },
      }));
    });

    it('only enables adaptive thinking on the smart (Sonnet) model', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-platform';
      vi.resetModules();
      mod = await import('./anthropic.js');

      createMock.mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
        model: 'claude-sonnet-4-6',
        usage: {},
        stop_reason: 'end_turn',
      });

      await mod.complete({}, { model: 'fast', messages: [], thinking: true, endpoint: 't' });
      expect(createMock.mock.calls[0][0].thinking).toBeUndefined();

      await mod.complete({}, { model: 'smart', messages: [], thinking: true, endpoint: 't' });
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
        model: 'claude-sonnet-4-6',
        usage: {},
        stop_reason: 'end_turn',
      });

      const result = await mod.complete({}, { model: 'smart', messages: [], endpoint: 't' });
      expect(result.text).toBe('first\nsecond');
    });
  });
});
