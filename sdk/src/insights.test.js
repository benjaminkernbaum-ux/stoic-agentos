import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentOS } from './index.js';

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
      // _send returns null on non-ok responses (matches other SDK methods)
      expect(result).toBeNull();
    });
  });
});
