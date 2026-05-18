/**
 * Tests for the Claude-powered insight methods added in v2.1:
 * summarize(), analyzeAgent(), ask().
 *
 * These are thin wrappers around fetch — we just verify the request
 * shape (URL, method, body, auth header) and that responses pass through.
 */

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
    it('POSTs to /insights/summarize with the auth header and hours payload', async () => {
      mockJson({ summary: 'all good', count: 12, model: 'claude-haiku-4-5' });

      const result = await os.summarize({ hours: 168 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.test/api/v1/insights/summarize');
      expect(opts.method).toBe('POST');
      expect(opts.headers.Authorization).toBe('Bearer sk_live_test');
      expect(JSON.parse(opts.body)).toEqual({
        hours: 168,
        agent_id: undefined,
        workspace_id: undefined,
      });
      expect(result.summary).toBe('all good');
    });

    it('defaults to 24h when called with no arguments', async () => {
      mockJson({ summary: '', count: 0 });
      await os.summarize();
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).hours).toBe(24);
    });

    it('forwards agent_id and workspace_id filters', async () => {
      mockJson({ summary: '', count: 0 });
      await os.summarize({ agent_id: 'a-1', workspace_id: 'w-2' });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.agent_id).toBe('a-1');
      expect(body.workspace_id).toBe('w-2');
    });
  });

  describe('analyzeAgent()', () => {
    it('POSTs to /insights/analyze-agent with the agent UUID', async () => {
      mockJson({ analysis: 'healthy', agent: { id: 'agent-uuid', name: 'foo' } });

      const result = await os.analyzeAgent('agent-uuid');

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/v1/insights/analyze-agent');
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ agent_id: 'agent-uuid' });
      expect(result.analysis).toBe('healthy');
    });
  });

  describe('ask()', () => {
    it('POSTs the question with fast model by default', async () => {
      mockJson({ answer: 'because of X', model: 'claude-haiku-4-5' });

      await os.ask('Why did the agent fail?');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toEqual({ question: 'Why did the agent fail?', model: 'fast' });
    });

    it('honours model="smart" for deeper analysis', async () => {
      mockJson({ answer: '', model: 'claude-sonnet-4-6' });
      await os.ask('how should I rearchitect this?', { model: 'smart' });
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('smart');
    });

    it('returns null and does not throw on a non-2xx response', async () => {
      mockJson({ error: 'No Anthropic API key configured' }, 402);
      const result = await os.ask('anything');
      // _send returns null on non-ok responses (matches other SDK methods)
      expect(result).toBeNull();
    });
  });
});
