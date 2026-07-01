import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalCircuitBreaker, BackgroundQueue } from './shield.js';

describe('LocalCircuitBreaker', () => {
  it('should not throw if circuit breaker is disabled', () => {
    const breaker = new LocalCircuitBreaker({ enabled: false, maxRpm: 1 });
    breaker.check();
    breaker.record(10);
    breaker.check(); // should not throw since it is disabled
  });

  it('should enforce RPM limits when enabled', () => {
    const breaker = new LocalCircuitBreaker({ enabled: true, maxRpm: 2 });
    breaker.check();
    breaker.record(10);
    breaker.check();
    breaker.record(10);
    
    // Third check should throw since maxRpm is 2 and we recorded 2
    expect(() => breaker.check()).toThrow(/Rate Limit Exceeded locally/);
  });

  it('should enforce TPM limits when enabled', () => {
    const breaker = new LocalCircuitBreaker({ enabled: true, maxTpm: 100 });
    breaker.check(50);
    breaker.record(50);
    breaker.check(40); // 50 + 40 = 90 (below 100), should pass
    breaker.record(40);
    
    // Now total is 90, checking with 15 would exceed 100, should throw
    expect(() => breaker.check(15)).toThrow(/Token Limit Exceeded locally/);
  });
});

describe('BackgroundQueue', () => {
  let mockSdk;

  beforeEach(() => {
    mockSdk = {
      debug: false,
      _send: vi.fn().mockResolvedValue({ success: true })
    };
  });

  it('should queue and flush items', async () => {
    const queue = new BackgroundQueue(mockSdk, { flushInterval: 1000, batchSize: 5 });
    
    // Enqueue 3 items
    queue.enqueue('/traces/ingest', { trace_id: '1' });
    queue.enqueue('/traces/ingest', { trace_id: '2' });
    queue.enqueue('/traces/ingest', { trace_id: '3' });
    
    expect(queue.queue.length).toBe(3);
    
    // Flush manually
    await queue.flush();
    
    expect(queue.queue.length).toBe(0);
    expect(mockSdk._send).toHaveBeenCalledTimes(3);
    expect(mockSdk._send).toHaveBeenCalledWith('/traces/ingest', { trace_id: '1' });
  });

  it('should auto-flush when batch size is reached', async () => {
    const queue = new BackgroundQueue(mockSdk, { flushInterval: 10000, batchSize: 2 });
    
    queue.enqueue('/traces/ingest', { trace_id: '1' });
    // This should trigger auto flush
    queue.enqueue('/traces/ingest', { trace_id: '2' });
    
    // Wait for the microtasks/flush promise to resolve
    await new Promise(resolve => setImmediate(resolve));
    
    expect(queue.queue.length).toBe(0);
    expect(mockSdk._send).toHaveBeenCalledTimes(2);
  });
});

describe('failClosed policy integration', () => {
  it('should fail-open when failClosed is false and API fails', async () => {
    const { AgentOS } = await import('./index.js');
    const { instrumentOpenAIClient } = await import('./instrumentors/openai.js');

    const mockSdk = new AgentOS({
      apiKey: 'sk_test_123',
      activeShield: true,
      criticalTools: ['delete_all'],
      failClosed: false,
    });

    vi.spyOn(mockSdk.compliance, 'suspend').mockRejectedValue(new Error('API Offline'));

    const mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            id: 'chatcmpl-123',
            choices: [{
              message: {
                content: 'done',
                tool_calls: [{
                  id: 'call_1',
                  type: 'function',
                  function: { name: 'delete_all', arguments: '{}' }
                }]
              }
            }],
            usage: { prompt_tokens: 10, completion_tokens: 10 }
          })
        }
      }
    };

    instrumentOpenAIClient(mockOpenAI, mockSdk);

    const res = await mockOpenAI.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'test' }]
    });

    expect(res.choices[0].message.content).toBe('done');
  });

  it('should fail-closed when failClosed is true and API fails', async () => {
    const { AgentOS } = await import('./index.js');
    const { instrumentOpenAIClient } = await import('./instrumentors/openai.js');

    const mockSdk = new AgentOS({
      apiKey: 'sk_test_123',
      activeShield: true,
      criticalTools: ['delete_all'],
      failClosed: true,
    });

    vi.spyOn(mockSdk.compliance, 'suspend').mockRejectedValue(new Error('API Offline'));

    const mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            id: 'chatcmpl-123',
            choices: [{
              message: {
                content: 'done',
                tool_calls: [{
                  id: 'call_1',
                  type: 'function',
                  function: { name: 'delete_all', arguments: '{}' }
                }]
              }
            }],
            usage: { prompt_tokens: 10, completion_tokens: 10 }
          })
        }
      }
    };

    instrumentOpenAIClient(mockOpenAI, mockSdk);

    await expect(mockOpenAI.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'test' }]
    })).rejects.toThrow(/HITL Shield validation failed/);
  });
});
