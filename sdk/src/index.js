/**
 * @stoic/agentos-sdk v3.0.0
 * Official SDK for Stoic AgentOS — AI Agent Operations Platform
 * 
 * Usage:
 *   import { AgentOS } from '@stoic/agentos-sdk';
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

const DEFAULT_API_URL = 'https://api.stoicagentos.com/api/v1';

const VALID_OBSERVATION_TYPES = [
  'note', 'decision', 'architecture', 'deployment', 'discovery',
  'file_edit', 'error', 'git_commit', 'agent_run', 'command',
  'dependency', 'config',
];

// ── Error Classes ──

export class AgentOSError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.name = 'AgentOSError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class AgentOSValidationError extends AgentOSError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'AgentOSValidationError';
  }
}

export class AgentOSAuthError extends AgentOSError {
  constructor(message) {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AgentOSAuthError';
  }
}

export class AgentOSRateLimitError extends AgentOSError {
  constructor(message, limit, current) {
    super(message, 'RATE_LIMIT', 429);
    this.name = 'AgentOSRateLimitError';
    this.limit = limit;
    this.current = current;
  }
}

// ── Main Client ──

export class AgentOS {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.AGENTOS_API_KEY || '';
    this.apiUrl = (options.apiUrl || process.env.AGENTOS_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
    this.workspace = options.workspace || 'default';
    this.debug = options.debug || false;
    this._queue = [];
    this._flushTimer = null;
    this._batchSize = options.batchSize || 10;
    this._flushInterval = options.flushInterval || 5000; // 5s
    this._maxRetries = options.maxRetries ?? 3;
    this._baseDelay = options.baseDelay ?? 500; // ms
    this._shutdownCalled = false;

    if (!this.apiKey) {
      console.warn(
        '[AgentOS] ⚠️  No API key provided.\n' +
        '  Set AGENTOS_API_KEY environment variable or pass apiKey option:\n' +
        '  const os = new AgentOS({ apiKey: "sk_live_xxx" });\n' +
        '  Get your key at: https://stoic-agentos.vercel.app/dashboard'
      );
    } else if (!this.apiKey.startsWith('sk_live_') && !this.apiKey.startsWith('sk_test_')) {
      console.warn(
        '[AgentOS] ⚠️  API key format looks wrong.\n' +
        '  Expected format: sk_live_xxx or sk_test_xxx\n' +
        '  Get your key at: https://stoic-agentos.vercel.app/dashboard'
      );
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
    if (!provider || typeof provider !== 'string') {
      throw new AgentOSValidationError('instrumentClient requires a provider name ("openai" or "anthropic")');
    }
    if (!client || typeof client !== 'object') {
      throw new AgentOSValidationError('instrumentClient requires a valid client instance');
    }

    switch (provider) {
      case 'openai':
        instrumentOpenAIClient(client, this);
        break;
      case 'anthropic':
        instrumentAnthropicClient(client, this);
        break;
      default:
        throw new AgentOSValidationError(
          `Unknown provider: "${provider}". Supported: "openai", "anthropic"`
        );
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
    if (!name || typeof name !== 'string') {
      throw new AgentOSValidationError('startTrace requires a name string');
    }
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
  // OBSERVATIONS
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
    if (!observation || typeof observation !== 'object') {
      throw new AgentOSValidationError('capture() requires an observation object');
    }
    if (!observation.title || typeof observation.title !== 'string') {
      throw new AgentOSValidationError('capture() requires a "title" string');
    }
    if (observation.type && !VALID_OBSERVATION_TYPES.includes(observation.type)) {
      throw new AgentOSValidationError(
        `Invalid observation type: "${observation.type}". ` +
        `Valid types: ${VALID_OBSERVATION_TYPES.join(', ')}`
      );
    }

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
    if (!agentName || typeof agentName !== 'string') {
      throw new AgentOSValidationError('wrapAgent requires an agentName string');
    }
    if (typeof fn !== 'function') {
      throw new AgentOSValidationError('wrapAgent requires a function as the second argument');
    }

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
    if (!agent || !agent.name) {
      throw new AgentOSValidationError('registerAgent requires an agent object with a "name" field');
    }
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
    if (options.limit) params.set('limit', String(options.limit));
    if (options.type) params.set('type', options.type);
    if (options.workspace) params.set('workspace', options.workspace);
    const qs = params.toString();
    return this._fetch(`/observations${qs ? `?${qs}` : ''}`);
  }

  /**
   * List traces
   * @param {Object} [options] - { limit, agent, status }
   */
  async getTraces(options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.agent) params.set('agent', options.agent);
    if (options.status) params.set('status', options.status);
    const qs = params.toString();
    return this._fetch(`/traces${qs ? `?${qs}` : ''}`);
  }

  // ═══════════════════════════════════
  // CLAUDE INSIGHTS
  // ═══════════════════════════════════

  /**
   * Summarize recent agent observations with Claude
   * @param {Object} [options] - { limit, agent_id, model }
   * @returns {{ summary: string, observation_count: number, usage: object }}
   */
  async summarize(options = {}) {
    return this._send('/insights/summarize', {
      limit: options.limit || 50,
      agent_id: options.agent_id || null,
      model: options.model || 'claude-haiku-4-5',
    });
  }

  /**
   * Deep Claude health analysis of a specific agent
   * @param {string} agentId - Agent UUID
   * @param {boolean} [includeTraces=true]
   * @returns {{ agent: object, analysis: string, usage: object }}
   */
  async analyzeAgent(agentId, includeTraces = true) {
    if (!agentId || typeof agentId !== 'string') {
      throw new AgentOSValidationError('analyzeAgent requires an agentId string');
    }
    return this._send('/insights/analyze-agent', {
      agent_id: agentId,
      include_traces: includeTraces,
    });
  }

  /**
   * Ask Claude a free-form question about your agent fleet
   * @param {string} question
   * @param {string} [context] - Additional context to include
   * @returns {{ answer: string, usage: object }}
   */
  async ask(question, context = '') {
    if (!question || typeof question !== 'string') {
      throw new AgentOSValidationError('ask() requires a question string');
    }
    return this._send('/insights/ask', { question, context });
  }

  // ═══════════════════════════════════
  // THREE-TIER MEMORY (v3.0)
  // ═══════════════════════════════════

  /** @type {MemoryClient} */
  get memory() {
    if (!this._memory) this._memory = new MemoryClient(this);
    return this._memory;
  }

  // ═══════════════════════════════════
  // COMPLIANCE & AUDIT (v3.0)
  // ═══════════════════════════════════

  /** @type {ComplianceClient} */
  get compliance() {
    if (!this._compliance) this._compliance = new ComplianceClient(this);
    return this._compliance;
  }

  // ═══════════════════════════════════
  // REFLECTION (v3.0)
  // ═══════════════════════════════════

  /** @type {ReflectionClient} */
  get reflection() {
    if (!this._reflection) this._reflection = new ReflectionClient(this);
    return this._reflection;
  }

  /**
   * Graceful shutdown — flush all pending data
   */
  async shutdown() {
    this._shutdownCalled = true;
    await this.flush();
  }

  // ── Internal: POST with retry ──

  async _send(path, body, method = 'POST') {
    let lastError;
    for (let attempt = 0; attempt <= this._maxRetries; attempt++) {
      try {
        const resp = await fetch(`${this.apiUrl}${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'User-Agent': 'stoic-agentos-sdk/3.0.0',
          },
          body: JSON.stringify(body),
        });

        // Don't retry client errors (4xx) except 429
        if (resp.status === 429) {
          const err = await resp.json().catch(() => ({}));
          if (attempt < this._maxRetries) {
            const delay = this._baseDelay * Math.pow(2, attempt) + Math.random() * 200;
            if (this.debug) console.warn(`[AgentOS] Rate limited, retrying in ${Math.round(delay)}ms...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          throw new AgentOSRateLimitError(err.error || 'Rate limited', err.limit, err.current);
        }

        if (resp.status === 401) {
          const err = await resp.json().catch(() => ({}));
          throw new AgentOSAuthError(err.error || 'Invalid API key. Check your key at https://stoic-agentos.vercel.app/dashboard');
        }

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          if (this.debug) console.warn(`[AgentOS] API error: ${resp.status}`, err);
          return null;
        }
        return resp.json();
      } catch (err) {
        if (err instanceof AgentOSError) throw err;
        lastError = err;

        // Retry on network errors
        if (attempt < this._maxRetries) {
          const delay = this._baseDelay * Math.pow(2, attempt) + Math.random() * 200;
          if (this.debug) console.warn(`[AgentOS] Network error, retry ${attempt + 1}/${this._maxRetries} in ${Math.round(delay)}ms: ${err.message}`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
    }
    if (this.debug) console.warn(`[AgentOS] All ${this._maxRetries + 1} attempts failed:`, lastError?.message);
    return null;
  }

  // ── Internal: GET with retry ──

  async _fetch(path) {
    let lastError;
    for (let attempt = 0; attempt <= this._maxRetries; attempt++) {
      try {
        const resp = await fetch(`${this.apiUrl}${path}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'User-Agent': 'stoic-agentos-sdk/3.0.0',
          },
        });

        if (resp.status === 429 && attempt < this._maxRetries) {
          const delay = this._baseDelay * Math.pow(2, attempt) + Math.random() * 200;
          if (this.debug) console.warn(`[AgentOS] Rate limited, retrying in ${Math.round(delay)}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        if (!resp.ok) return null;
        return resp.json();
      } catch (err) {
        lastError = err;
        if (attempt < this._maxRetries) {
          const delay = this._baseDelay * Math.pow(2, attempt) + Math.random() * 200;
          if (this.debug) console.warn(`[AgentOS] Network error, retry ${attempt + 1}/${this._maxRetries}: ${err.message}`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
    }
    return null;
  }
}

// ═══════════════════════════════════════════════
// MEMORY CLIENT — Three-Tier Memory Architecture
// ═══════════════════════════════════════════════

class MemoryClient {
  constructor(sdk) { this._sdk = sdk; }

  // ── Tier 1: Working Memory ──

  /** Store/update a working memory entry */
  async setWorking(sessionId, key, value, { agentId, ttlSeconds } = {}) {
    return this._sdk._send('/memory/working', {
      session_id: sessionId, key, value,
      agent_id: agentId || null,
      ttl_seconds: ttlSeconds || null,
    });
  }

  /** Retrieve working memory for a session */
  async getWorking({ agentId, sessionId } = {}) {
    const params = new URLSearchParams();
    if (sessionId) params.set('session_id', sessionId);
    if (agentId) params.set('agent_id', agentId);
    const qs = params.toString();
    return this._sdk._fetch(`/memory/working${qs ? `?${qs}` : ''}`);
  }

  /** Delete a working memory entry by ID */
  async deleteWorking(id) {
    return this._sdk._send(`/memory/working/${id}`, null, 'DELETE');
  }

  // ── Tier 2: Episodic Memory ──

  /** Record a timestamped episode */
  async recordEpisode(content, { eventType, importance, agentId, metadata } = {}) {
    return this._sdk._send('/memory/episodic', {
      content, event_type: eventType || 'observation',
      importance: importance || 5, agent_id: agentId || null,
      metadata: metadata || {},
    });
  }

  /** List episodes with filters */
  async listEpisodes({ agentId, eventType, minImportance } = {}) {
    const params = new URLSearchParams();
    if (agentId) params.set('agent_id', agentId);
    if (eventType) params.set('event_type', eventType);
    if (minImportance) params.set('min_importance', String(minImportance));
    const qs = params.toString();
    return this._sdk._fetch(`/memory/episodic${qs ? `?${qs}` : ''}`);
  }

  /** Get episodic memory as a timeline grouped by day */
  async timeline() {
    return this._sdk._fetch('/memory/episodic/timeline');
  }

  // ── Tier 3: Semantic Memory ──

  /** Store a knowledge triple */
  async storeTriple(subject, relation, object, { confidence, sourceType } = {}) {
    return this._sdk._send('/memory/semantic', {
      subject, relation, object,
      confidence: confidence ?? null, source_type: sourceType || null,
    });
  }

  /** Query knowledge triples */
  async queryTriples({ subject, relation } = {}) {
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (relation) params.set('relation', relation);
    const qs = params.toString();
    return this._sdk._fetch(`/memory/semantic${qs ? `?${qs}` : ''}`);
  }

  /** Delete a semantic triple */
  async deleteTriple(tripleId) {
    return this._sdk._send(`/memory/semantic/${tripleId}`, null, 'DELETE');
  }

  /** Get memory statistics across all tiers */
  async stats() { return this._sdk._fetch('/memory/stats'); }
}

// ═══════════════════════════════════════════════
// COMPLIANCE CLIENT — Audit + Circuit Breaker
// ═══════════════════════════════════════════════

class ComplianceClient {
  constructor(sdk) { this._sdk = sdk; }

  /** Log an audit event (immutable) */
  async logEvent(eventType, action, { agentId, reasoning, verdict, metadata, policyVersion, contextHash } = {}) {
    return this._sdk._send('/compliance/audit-log', {
      event_type: eventType, action,
      agent_id: agentId || null, reasoning: reasoning || null,
      verdict: verdict || 'PROCEED', metadata: metadata || {},
      policy_version: policyVersion || '1.0',
      context_hash: contextHash || null,
    });
  }

  /** Query audit log with filters */
  async getEvents({ agentId, eventType, verdict, from, to } = {}) {
    const params = new URLSearchParams();
    if (agentId) params.set('agent_id', agentId);
    if (eventType) params.set('event_type', eventType);
    if (verdict) params.set('verdict', verdict);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return this._sdk._fetch(`/compliance/audit-log${qs ? `?${qs}` : ''}`);
  }

  /** Export audit trail (returns downloadable JSON) */
  async export({ from, to } = {}) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return this._sdk._fetch(`/compliance/audit-log/export?${params}`);
  }

  /** Get circuit breaker status for all agents (read-only) */
  async circuitBreaker() {
    return this._sdk._fetch('/compliance/circuit-breaker');
  }

  /** Get audit log statistics — by type, verdict, and day */
  async stats() { return this._sdk._fetch('/compliance/audit-log/stats'); }
}

// ═══════════════════════════════════════════════
// REFLECTION CLIENT — AI Knowledge Extraction
// ═══════════════════════════════════════════════

class ReflectionClient {
  constructor(sdk) { this._sdk = sdk; }

  /**
   * Run Claude-powered reflection — extract semantic triples from recent episodes.
   * Requires Anthropic API key configured on the org.
   */
  async run() {
    return this._sdk._send('/reflection/run', {});
  }

  /**
   * Trigger memory decay cycle:
   * - Delete expired working memory (TTL)
   * - Reduce importance of episodes older than 30 days
   * - Reduce confidence of semantic triples older than 60 days
   */
  async decay() {
    return this._sdk._send('/reflection/decay', {});
  }

  /** Get timestamps of last reflection run and last decay cycle */
  async status() { return this._sdk._fetch('/reflection/status'); }
}

// ── Convenience exports ──
export function createAgentOS(options) {
  return new AgentOS(options);
}

export { Trace } from './trace.js';
export { estimateCost, MODEL_PRICING } from './pricing.js';

export default AgentOS;
