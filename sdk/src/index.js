/**
 * @stoic/agentos-sdk v2.0.0
 * Official SDK for Stoic AgentOS — AI Agent Operations Platform
 * 
 * Usage:
 *   import { AgentOS } from 'stoic-agentos-sdk';
 *   const os = new AgentOS({ apiKey: 'sk_live_xxx', workspace: 'my-app' });
 *   
 *   // Auto-instrument LLM providers (zero-config observability)
 *   os.instrumentClient('openai', openaiClient);
 *   os.instrumentClient('anthropic', anthropicClient);
 *   
 *   // All LLM calls are now auto-captured with tokens, cost, latency
 *   
 *   // Group related calls into a trace
 *   const trace = os.startTrace('process-email');
 *   const result = await myAgent(email);
 *   await trace.end();
 *   
 *   // Manual capture
 *   os.capture({ type: 'decision', title: 'Switched model', content: '...' });
 */

import { Trace, setActiveTrace, clearActiveTrace, getActiveTrace } from './trace.js';
import { instrumentOpenAIClient } from './instrumentors/openai.js';
import { instrumentAnthropicClient } from './instrumentors/anthropic.js';
import { estimateCost, MODEL_PRICING } from './pricing.js';

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

  // ═══════════════════════════════════
  // AUTO-INSTRUMENTATION (v2.0)
  // ═══════════════════════════════════

  /**
   * Instrument an LLM client instance for automatic trace capture
   * @param {'openai'|'anthropic'} provider - Provider name
   * @param {object} client - The client instance (e.g., new OpenAI())
   * 
   * @example
   *   import OpenAI from 'openai';
   *   const openai = new OpenAI();
   *   os.instrumentClient('openai', openai);
   *   // All openai.chat.completions.create() calls now auto-captured
   */
  instrumentClient(provider, client) {
    switch (provider) {
      case 'openai':
        instrumentOpenAIClient(client, this);
        break;
      case 'anthropic':
        instrumentAnthropicClient(client, this);
        break;
      default:
        console.warn(`[AgentOS] Unknown provider: ${provider}. Supported: openai, anthropic`);
    }
    return this; // Allow chaining
  }

  /**
   * Start a new trace (groups related LLM calls)
   * @param {string} name - Trace name (e.g., 'process-customer-email')
   * @param {Object} [options] - { agent, metadata }
   * @returns {Trace}
   * 
   * @example
   *   const trace = os.startTrace('email-pipeline', { agent: 'email-processor' });
   *   const result = await myAgent(input);
   *   await trace.end(); // Sends trace + all captured spans
   */
  startTrace(name, options = {}) {
    const trace = new Trace(this, name, options);
    setActiveTrace(trace);
    return trace;
  }

  /**
   * End the active trace (if any) and send to API
   */
  async endTrace(status) {
    const trace = getActiveTrace();
    if (trace) {
      clearActiveTrace();
      return trace.end(status);
    }
  }

  // ═══════════════════════════════════
  // OBSERVATIONS (v1.0 — unchanged)
  // ═══════════════════════════════════

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
   * Now also creates a trace for each agent run
   * @param {string} agentName - Human-readable agent name
   * @param {Function} fn - The agent function to wrap
   * @returns {Function} Wrapped function
   */
  wrapAgent(agentName, fn) {
    const sdk = this;

    return async function wrappedAgent(...args) {
      // Start a trace for this agent run
      const trace = sdk.startTrace(`agent:${agentName}`, { agent: agentName });
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

        // End trace with success
        await trace.end('success');

        // Update agent heartbeat
        await sdk._send('/agents/heartbeat', { name: agentName, status: 'success' }).catch(() => {});

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

        // End trace with error
        await trace.end('error');

        // Record error heartbeat
        await sdk._send('/agents/heartbeat', { name: agentName, status: 'error' }).catch(() => {});

        throw error; // Re-throw
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

  /**
   * List traces
   * @param {Object} [options] - { limit, agent, status }
   */
  async getTraces(options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit);
    if (options.agent) params.set('agent', options.agent);
    if (options.status) params.set('status', options.status);
    return this._fetch(`/traces?${params}`);
  }

  // ═══════════════════════════════════
  // CLAUDE INSIGHTS (v2.1)
  // ═══════════════════════════════════

  /**
   * Summarize recent observations using Claude.
   * @param {Object} [options]
   * @param {number} [options.hours=24] - Window in hours
   * @param {string} [options.agent_id] - Filter to one agent
   * @param {string} [options.workspace_id] - Filter to one workspace
   * @returns {Promise<{summary: string, count: number, model: string, usage: object}>}
   */
  async summarize(options = {}) {
    return this._send('/insights/summarize', {
      hours: options.hours || 24,
      agent_id: options.agent_id,
      workspace_id: options.workspace_id,
    });
  }

  /**
   * Diagnose an agent's reliability using Claude (Sonnet 4.6 with thinking).
   * @param {string} agentId - Agent UUID
   * @returns {Promise<{analysis: string, agent: object, model: string, usage: object}>}
   */
  async analyzeAgent(agentId) {
    return this._send('/insights/analyze-agent', { agent_id: agentId });
  }

  /**
   * Ask a free-form question grounded in your org's data.
   * @param {string} question
   * @param {Object} [options]
   * @param {'fast'|'smart'} [options.model='fast'] - fast=Haiku 4.5, smart=Sonnet 4.6
   */
  async ask(question, options = {}) {
    return this._send('/insights/ask', { question, model: options.model || 'fast' });
  }

  /**
   * Get cost breakdown for current month
   */
  async getCosts(period) {
    const params = period ? `?period=${period}` : '';
    return this._fetch(`/costs${params}`);
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

// ── Convenience exports ──
export function createAgentOS(options) {
  return new AgentOS(options);
}

export { Trace } from './trace.js';
export { estimateCost, MODEL_PRICING } from './pricing.js';

export default AgentOS;
