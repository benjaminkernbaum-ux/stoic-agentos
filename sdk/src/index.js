/**
 * @stoic/agentos-sdk
 * Official SDK for Stoic AgentOS — AI Agent Operations Platform
 * 
 * Usage:
 *   import { AgentOS } from '@stoic/agentos-sdk';
 *   const os = new AgentOS({ apiKey: 'sk_live_xxx', workspace: 'my-app' });
 *   
 *   // Wrap any agent function
 *   const myAgent = os.wrapAgent('processor', async (input) => { ... });
 *   
 *   // Manual capture
 *   os.capture({ type: 'decision', title: 'Switched model', content: '...' });
 */

const DEFAULT_API_URL = 'https://stoic-agentos-api-production.up.railway.app/api/v1';

export class AgentOS {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.AGENTOS_API_KEY || '';
    this.apiUrl = options.apiUrl || process.env.AGENTOS_API_URL || DEFAULT_API_URL;
    this.workspace = options.workspace || 'default';
    this.debug = options.debug || false;
    this._queue = [];
    this._flushTimer = null;
    this._batchSize = options.batchSize || 10;
    this._flushInterval = options.flushInterval || 5000; // 5s

    if (!this.apiKey) {
      console.warn('[AgentOS] No API key provided. Set AGENTOS_API_KEY or pass apiKey option.');
    }

    // Auto-flush on process exit
    if (typeof process !== 'undefined') {
      process.on('beforeExit', () => this.flush());
      process.on('SIGINT', () => { this.flush(); process.exit(0); });
    }
  }

  /**
   * Capture an observation
   * @param {Object} observation
   * @param {string} observation.type - note|decision|architecture|deployment|discovery|file_edit|error|agent_run
   * @param {string} observation.title - Short title
   * @param {string} [observation.content] - Detailed content
   * @param {string} [observation.agent] - Agent name/ID
   * @param {Object} [observation.metadata] - Extra data
   */
  async capture(observation) {
    const payload = {
      workspace: this.workspace,
      type: observation.type || 'note',
      title: observation.title,
      content: observation.content || '',
      agent: observation.agent || null,
      metadata: observation.metadata || {},
    };

    this._queue.push(payload);

    if (this._queue.length >= this._batchSize) {
      await this.flush();
    } else if (!this._flushTimer) {
      this._flushTimer = setTimeout(() => this.flush(), this._flushInterval);
    }
  }

  /**
   * Flush queued observations to the API
   */
  async flush() {
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }

    const batch = this._queue.splice(0);
    if (batch.length === 0) return;

    if (this.debug) {
      console.log(`[AgentOS] Flushing ${batch.length} observations`);
    }

    // Send individually (batch endpoint can be added later)
    const results = await Promise.allSettled(
      batch.map(obs => this._send('/observations', obs))
    );

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0 && this.debug) {
      console.warn(`[AgentOS] ${failed.length}/${batch.length} observations failed to send`);
    }
  }

  /**
   * Wrap an agent function with auto-capture
   * Automatically logs: agent_start, agent_success/agent_error
   * @param {string} agentName - Human-readable agent name
   * @param {Function} fn - The agent function to wrap
   * @returns {Function} Wrapped function
   */
  wrapAgent(agentName, fn) {
    const sdk = this;

    return async function wrappedAgent(...args) {
      const startTime = Date.now();

      await sdk.capture({
        type: 'agent_run',
        title: `[${agentName}] Started`,
        agent: agentName,
        metadata: { event: 'start', args_count: args.length },
      });

      try {
        const result = await fn.apply(this, args);
        const durationMs = Date.now() - startTime;

        await sdk.capture({
          type: 'agent_run',
          title: `[${agentName}] ✅ Success (${durationMs}ms)`,
          agent: agentName,
          metadata: { event: 'success', duration_ms: durationMs },
        });

        await sdk._send('/agents/heartbeat', { name: agentName, status: 'success', last_heartbeat: new Date().toISOString() }).catch(() => {});

        return result;
      } catch (error) {
        const durationMs = Date.now() - startTime;

        await sdk.capture({
          type: 'error',
          title: `[${agentName}] ❌ Error: ${error.message}`,
          content: error.stack || error.message,
          agent: agentName,
          metadata: { event: 'error', duration_ms: durationMs, error_name: error.name },
        });

        await sdk._send('/agents/heartbeat', { name: agentName, status: 'error', last_heartbeat: new Date().toISOString() }).catch(() => {});

        throw error;
      }
    };
  }

  /**
   * Register an agent with the platform
   * @param {Object} agent - { name, description, module }
   */
  async registerAgent(agent) {
    return this._send('/agents', {
      name: agent.name,
      description: agent.description || '',
      module: agent.module || 'standalone',
      status: 'idle',
    });
  }

  /**
   * Get dashboard stats
   */
  async getStats() {
    return this._fetch('/stats');
  }

  /**
   * List recent observations
   * @param {Object} [options] - { limit, type, workspace }
   */
  async getObservations(options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit);
    if (options.type) params.set('type', options.type);
    if (options.workspace) params.set('workspace', options.workspace);
    return this._fetch(`/observations?${params}`);
  }

  // ── Internal ──

  async _send(path, body, method = 'POST') {
    try {
      const resp = await fetch(`${this.apiUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (this.debug) console.warn(`[AgentOS] API error: ${resp.status}`, err);
        return null;
      }
      return resp.json();
    } catch (err) {
      if (this.debug) console.warn(`[AgentOS] Network error:`, err.message);
      return null;
    }
  }

  async _fetch(path) {
    try {
      const resp = await fetch(`${this.apiUrl}${path}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      if (!resp.ok) return null;
      return resp.json();
    } catch {
      return null;
    }
  }
}

// ── Convenience export ──
export function createAgentOS(options) {
  return new AgentOS(options);
}

export default AgentOS;
