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
