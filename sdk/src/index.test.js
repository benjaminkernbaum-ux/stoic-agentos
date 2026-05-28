import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentOS, AgentOSValidationError, AgentOSAuthError } from './index.js';

describe('AgentOS constructor', () => {
  it('accepts apiKey and apiUrl options', () => {
    const os = new AgentOS({ apiKey: 'sk_live_test', apiUrl: 'https://api.test/api/v1' });
    expect(os.apiKey).toBe('sk_live_test');
    expect(os.apiUrl).toBe('https://api.test/api/v1');
    expect(os.workspace).toBe('default');
  });

  it('strips trailing slashes from apiUrl', () => {
    const os = new AgentOS({ apiKey: 'sk_live_x', apiUrl: 'https://api.test/api/v1/' });
    expect(os.apiUrl).toBe('https://api.test/api/v1');
  });

  it('defaults to production API URL', () => {
    const os = new AgentOS({ apiKey: 'sk_live_x' });
    expect(os.apiUrl).toContain('agent-ops-production');
  });
});

describe('AgentOS input validation', () => {
  let os;
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    os = new AgentOS({ apiKey: 'sk_live_test', apiUrl: 'https://api.test/api/v1' });
  });

  it('throws on capture() with no argument', async () => {
    await expect(os.capture()).rejects.toThrow(AgentOSValidationError);
  });

  it('throws on capture() with missing title', async () => {
    await expect(os.capture({ type: 'note' })).rejects.toThrow('requires a "title" string');
  });

  it('throws on capture() with invalid type', async () => {
    await expect(os.capture({ title: 'test', type: 'invalid_type' })).rejects.toThrow('Invalid observation type');
  });

  it('accepts valid observation types', async () => {
    // Should not throw
    await os.capture({ title: 'test', type: 'decision' });
    await os.capture({ title: 'test', type: 'error' });
    await os.capture({ title: 'test', type: 'agent_run' });
  });

  it('throws on wrapAgent with non-function', () => {
    expect(() => os.wrapAgent('test', 'not a fn')).toThrow('requires a function');
  });

  it('throws on wrapAgent with empty name', () => {
    expect(() => os.wrapAgent('', () => {})).toThrow('requires an agentName');
  });

  it('throws on registerAgent with no name', async () => {
    await expect(os.registerAgent({})).rejects.toThrow('requires an agent object with a "name" field');
  });

  it('throws on analyzeAgent with no agentId', async () => {
    await expect(os.analyzeAgent()).rejects.toThrow('requires an agentId');
  });

  it('throws on ask with no question', async () => {
    await expect(os.ask()).rejects.toThrow('requires a question');
  });

  it('throws on instrumentClient with unknown provider', () => {
    expect(() => os.instrumentClient('gemini', {})).toThrow('Unknown provider');
  });

  it('throws on startTrace with no name', () => {
    expect(() => os.startTrace()).toThrow('requires a name');
  });
});

describe('AgentOS retry logic', () => {
  let os;
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    os = new AgentOS({
      apiKey: 'sk_live_test',
      apiUrl: 'https://api.test/api/v1',
      maxRetries: 2,
      baseDelay: 10, // Short for tests
    });
  });

  it('retries on network error and succeeds', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: '123' }) });

    const result = await os._send('/test', { foo: 'bar' });
    expect(result).toEqual({ id: '123' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on 429 and succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: 'Rate limited' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: '456' }) });

    const result = await os._send('/test', {});
    expect(result).toEqual({ id: '456' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws AgentOSAuthError on 401', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false, status: 401,
      json: async () => ({ error: 'Invalid API key' }),
    });

    await expect(os._send('/test', {})).rejects.toThrow(AgentOSAuthError);
  });

  it('returns null after exhausting retries on network error', async () => {
    fetchMock.mockRejectedValue(new Error('Network down'));

    const result = await os._send('/test', {});
    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});

describe('AgentOS Claude insights', () => {
  let os;
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    os = new AgentOS({
      apiKey: 'sk_live_test',
      apiUrl: 'https://api.test/api/v1',
    });
  });

  function mockJson(body, status = 200) {
    fetchMock.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    });
  }

  describe('summarize()', () => {
    it('POSTs to /insights/summarize with the auth header and limit payload', async () => {
      mockJson({ summary: 'all good', count: 12, model: 'claude-haiku-4-5' });

      const result = await os.summarize({ limit: 100 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.test/api/v1/insights/summarize');
      expect(opts.method).toBe('POST');
      expect(opts.headers.Authorization).toBe('Bearer sk_live_test');
      expect(JSON.parse(opts.body)).toEqual({
        limit: 100,
        agent_id: null,
        model: 'claude-haiku-4-5',
      });
      expect(result.summary).toBe('all good');
    });

    it('defaults to limit 50 when called with no arguments', async () => {
      mockJson({ summary: '', count: 0 });
      await os.summarize();
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).limit).toBe(50);
    });

    it('forwards agent_id filter', async () => {
      mockJson({ summary: '', count: 0 });
      await os.summarize({ agent_id: 'a-1' });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.agent_id).toBe('a-1');
    });
  });

  describe('analyzeAgent()', () => {
    it('POSTs to /insights/analyze-agent with the agent UUID and include_traces', async () => {
      mockJson({ analysis: 'healthy', agent: { id: 'agent-uuid', name: 'foo' } });

      const result = await os.analyzeAgent('agent-uuid');

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/v1/insights/analyze-agent');
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ agent_id: 'agent-uuid', include_traces: true });
      expect(result.analysis).toBe('healthy');
    });
  });

  describe('ask()', () => {
    it('POSTs the question with context by default', async () => {
      mockJson({ answer: 'because of X' });

      await os.ask('Why did the agent fail?');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toEqual({ question: 'Why did the agent fail?', context: '' });
    });

    it('honours context for deeper analysis', async () => {
      mockJson({ answer: '' });
      await os.ask('how should I rearchitect this?', 'some context');
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).context).toBe('some context');
    });

    it('returns null and does not throw on a non-2xx response', async () => {
      mockJson({ error: 'No Anthropic API key configured' }, 402);
      const result = await os.ask('anything');
      expect(result).toBeNull();
    });
  });
});

describe('AgentOS flush behavior', () => {
  let os;
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock;
    os = new AgentOS({
      apiKey: 'sk_live_test',
      apiUrl: 'https://api.test/api/v1',
      batchSize: 3,
    });
  });

  it('auto-flushes when batch size is reached', async () => {
    await os.capture({ title: 'obs 1' });
    await os.capture({ title: 'obs 2' });
    expect(fetchMock).not.toHaveBeenCalled();

    await os.capture({ title: 'obs 3' }); // triggers flush
    expect(fetchMock).toHaveBeenCalledTimes(3); // 3 individual sends
  });

  it('shutdown() flushes remaining observations', async () => {
    await os.capture({ title: 'obs 1' });
    await os.capture({ title: 'obs 2' });
    expect(fetchMock).not.toHaveBeenCalled();

    await os.shutdown();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('AgentOS wrapAgent', () => {
  let os;
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock;
    os = new AgentOS({
      apiKey: 'sk_live_test',
      apiUrl: 'https://api.test/api/v1',
      batchSize: 100,
    });
  });

  it('wraps a successful agent run with start/success capture and heartbeat', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const wrapped = os.wrapAgent('test-agent', fn);

    const result = await wrapped('arg1');
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledWith('arg1');

    // Should flush: start capture, success capture, trace end, heartbeat
    await os.flush();
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('wraps a failed agent run with error capture and re-throws', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    const wrapped = os.wrapAgent('error-agent', fn);

    await expect(wrapped()).rejects.toThrow('boom');

    await os.flush();
    // Should have captured start, error, trace, heartbeat
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
