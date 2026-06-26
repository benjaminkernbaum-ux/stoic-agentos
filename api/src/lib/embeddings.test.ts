import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getEmbedding } from './embeddings.js';

describe('getEmbedding', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns null if text is empty or not a string', async () => {
    // @ts-ignore
    expect(await getEmbedding(null)).toBeNull();
    expect(await getEmbedding('')).toBeNull();
  });

  it('returns null if OPENAI_API_KEY is missing', async () => {
    process.env.OPENAI_API_KEY = '';
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await getEmbedding('hello');
    expect(result).toBeNull();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('OPENAI_API_KEY is not configured'));
  });

  it('returns a 384-dimensional float array if OpenAI API succeeds', async () => {
    process.env.OPENAI_API_KEY = 'sk-proj-test';

    const mockVector = Array(384).fill(0.1);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ embedding: mockVector }],
      }),
    });

    vi.stubGlobal('fetch', mockFetch);

    const result = await getEmbedding('hello');
    expect(result).toEqual(mockVector);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-proj-test',
        }),
        body: JSON.stringify({
          input: 'hello',
          model: 'text-embedding-3-small',
          dimensions: 384,
        }),
      })
    );
  });

  it('returns null if OpenAI API returns non-ok response', async () => {
    process.env.OPENAI_API_KEY = 'sk-proj-test';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid API key' } }),
    });

    vi.stubGlobal('fetch', mockFetch);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await getEmbedding('hello');
    expect(result).toBeNull();
    expect(errSpy).toHaveBeenCalled();
  });

  it('returns null if embedding vector length is not 384', async () => {
    process.env.OPENAI_API_KEY = 'sk-proj-test';

    const mockVector = Array(128).fill(0.1); // invalid length
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ embedding: mockVector }],
      }),
    });

    vi.stubGlobal('fetch', mockFetch);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await getEmbedding('hello');
    expect(result).toBeNull();
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid embedding format received'));
  });
});
