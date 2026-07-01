/**
 * Stoic AgentOS SDK — Shield Components
 * 
 * 1. LocalCircuitBreaker: Zero-latency local limits for RPM / TPM
 * 2. BackgroundQueue: Asynchronous batch queue for trace transmission
 */

export class LocalCircuitBreaker {
  constructor(options = {}) {
    this.enabled = options.enabled || false;
    this.maxRpm = options.maxRpm || 0; // 0 means disabled
    this.maxTpm = options.maxTpm || 0; // 0 means disabled
    
    // Request tracking: array of { timestamp, tokens }
    this.history = [];
  }

  /**
   * Cleans up history older than 60 seconds
   */
  _cleanup() {
    const now = Date.now();
    const cutoff = now - 60000;
    this.history = this.history.filter(h => h.timestamp > cutoff);
  }

  /**
   * Check if executing a request would trip the circuit breaker.
   * @param {number} estimatedTokens - Estimated tokens of the incoming prompt (optional)
   * @returns {void}
   * @throws {Error} if limits are exceeded
   */
  check(estimatedTokens = 0) {
    if (!this.enabled) return;

    this._cleanup();
    const now = Date.now();

    // Check RPM
    if (this.maxRpm > 0) {
      const currentRpm = this.history.length;
      if (currentRpm >= this.maxRpm) {
        throw new Error(
          `[AgentOS Shield] 🚨 Circuit Breaker Tripped: Rate Limit Exceeded locally. ` +
          `Current: ${currentRpm} RPM (Max: ${this.maxRpm} RPM).`
        );
      }
    }

    // Check TPM
    if (this.maxTpm > 0) {
      const currentTpm = this.history.reduce((sum, h) => sum + h.tokens, 0);
      if (currentTpm + estimatedTokens > this.maxTpm) {
        throw new Error(
          `[AgentOS Shield] 🚨 Circuit Breaker Tripped: Token Limit Exceeded locally. ` +
          `Current: ${currentTpm} TPM + ${estimatedTokens} estimated (Max: ${this.maxTpm} TPM).`
        );
      }
    }
  }

  /**
   * Record a successful LLM request's resource consumption
   */
  record(tokens = 0) {
    if (!this.enabled) return;

    this.history.push({
      timestamp: Date.now(),
      tokens: tokens || 0
    });
    this._cleanup();
  }
}

export class BackgroundQueue {
  constructor(sdk, options = {}) {
    this.sdk = sdk;
    this.queue = [];
    this.intervalMs = options.flushInterval || 2000; // default 2s
    this.batchSize = options.batchSize || 10;
    this.timer = null;
    this.isFlushing = false;
    this.retriesMap = new Map(); // tracking retries for failed payloads
    this.maxRetries = options.maxRetries ?? 5;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Queue a payload for background transmission
   */
  enqueue(endpoint, payload) {
    this.queue.push({ endpoint, payload, id: Math.random().toString(36).slice(2, 9), addedAt: Date.now() });
    
    // Proactive flush if batch size exceeded
    if (this.queue.length >= this.batchSize && !this.isFlushing) {
      this.flush();
    }
  }

  /**
   * Flush the queue assynchronously in background
   */
  async flush() {
    if (this.isFlushing || this.queue.length === 0) return;
    this.isFlushing = true;

    try {
      while (this.queue.length > 0) {
        // Take a snapshot of the current batch
        const batch = this.queue.splice(0, this.batchSize);

        // Group by endpoint to perform batch API calls
        const endpointsGroup = {};
        batch.forEach(item => {
          if (!endpointsGroup[item.endpoint]) {
            endpointsGroup[item.endpoint] = [];
          }
          endpointsGroup[item.endpoint].push(item);
        });

        const promises = Object.entries(endpointsGroup).map(async ([endpoint, items]) => {
          try {
            await Promise.all(items.map(async (item) => {
              try {
                await this.sdk._send(endpoint, item.payload);
              } catch (err) {
                this._handleFailedItem(item);
              }
            }));
          } catch (err) {
            items.forEach(item => this._handleFailedItem(item));
          }
        });

        await Promise.all(promises);
      }
    } catch (err) {
      if (this.sdk.debug) {
        console.error('[AgentOS Shield] Queue flush error:', err.message);
      }
    } finally {
      this.isFlushing = false;
    }
  }

  _handleFailedItem(item) {
    const retries = this.retriesMap.get(item.id) || 0;
    if (retries < this.maxRetries) {
      this.retriesMap.set(item.id, retries + 1);
      // Put back in queue with backoff delay (simulate by delaying re-enqueue)
      setTimeout(() => {
        this.queue.push(item);
      }, Math.pow(2, retries) * 1000);
    } else {
      this.retriesMap.delete(item.id);
      if (this.sdk.debug) {
        console.warn(`[AgentOS Shield] Max retries reached for queued item. Dropping trace data.`, item.endpoint);
      }
    }
  }
}
