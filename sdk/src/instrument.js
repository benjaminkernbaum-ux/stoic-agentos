/**
 * @stoic/agentos-sdk — Auto-Instrumentation Engine
 * 
 * Monkey-patches OpenAI and Anthropic SDK clients to automatically
 * capture every LLM call as a trace span. Zero config required.
 * 
 * Usage:
 *   import { AgentOS } from 'stoic-agentos-sdk';
 *   const os = new AgentOS({ apiKey: 'sk_live_xxx' });
 *   os.instrument();
 * 
 *   // All subsequent OpenAI/Anthropic calls are auto-captured
 *   const openai = new OpenAI();
 *   await openai.chat.completions.create({ model: 'gpt-4o', messages: [...] });
 */

// ── Pricing Table (per 1M tokens, USD) ──
const PRICING = {
  // OpenAI
  'gpt-4o':              { input: 2.50,  output: 10.00 },
  'gpt-4o-2024-11-20':   { input: 2.50,  output: 10.00 },
  'gpt-4o-2024-08-06':   { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':         { input: 0.15,  output: 0.60 },
  'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.60 },
  'gpt-4-turbo':         { input: 10.00, output: 30.00 },
  'gpt-4-turbo-preview': { input: 10.00, output: 30.00 },
  'gpt-4':               { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo':       { input: 0.50,  output: 1.50 },
  'o1':                  { input: 15.00, output: 60.00 },
  'o1-mini':             { input: 3.00,  output: 12.00 },
  'o1-preview':          { input: 15.00, output: 60.00 },
  'o3':                  { input: 10.00, output: 40.00 },
  'o3-mini':             { input: 1.10,  output: 4.40 },
  // Anthropic
  'claude-sonnet-4-20250514':    { input: 3.00,  output: 15.00 },
  'claude-opus-4-20250514':      { input: 15.00, output: 75.00 },
  'claude-3-7-sonnet-20250219':  { input: 3.00,  output: 15.00 },
  'claude-3-5-sonnet-20241022':  { input: 3.00,  output: 15.00 },
  'claude-3-5-sonnet-20240620':  { input: 3.00,  output: 15.00 },
  'claude-3-5-haiku-20241022':   { input: 0.80,  output: 4.00 },
  'claude-3-opus-20240229':      { input: 15.00, output: 75.00 },
  'claude-3-sonnet-20240229':    { input: 3.00,  output: 15.00 },
  'claude-3-haiku-20240307':     { input: 0.25,  output: 1.25 },
  // Aliases
  'claude-sonnet-4':     { input: 3.00,  output: 15.00 },
  'claude-opus-4':       { input: 15.00, output: 75.00 },
  'claude-3.5-sonnet':   { input: 3.00,  output: 15.00 },
  'claude-3.5-haiku':    { input: 0.80,  output: 4.00 },
  'claude-3-opus':       { input: 15.00, output: 75.00 },
  'claude-3-sonnet':     { input: 3.00,  output: 15.00 },
  'claude-3-haiku':      { input: 0.25,  output: 1.25 },
};

// ── Utilities ──

/** Generate a short unique ID (no deps) */
function uid() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const ts = Date.now().toString(36);
  let rand = '';
  for (let i = 0; i < 8; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `${ts}-${rand}`;
}

/** Compute cost from token usage and model */
function computeCost(model, promptTokens, completionTokens) {
  const pricing = PRICING[model];
  if (!pricing) return 0;
  return ((promptTokens / 1_000_000) * pricing.input) + ((completionTokens / 1_000_000) * pricing.output);
}

/** Normalize model name to try matching pricing table */
function normalizeModel(model) {
  if (!model) return 'unknown';
  // Try exact match first
  if (PRICING[model]) return model;
  // Try without date suffix
  const base = model.replace(/-\d{8}$/, '');
  if (PRICING[base]) return base;
  // Try common aliases
  const lower = model.toLowerCase();
  for (const key of Object.keys(PRICING)) {
    if (lower.includes(key) || key.includes(lower)) return key;
  }
  return model;
}

// ── Trace Context ──

export class TraceContext {
  constructor(sdk) {
    this._sdk = sdk;
    this._activeTraces = new Map(); // traceId → { name, agent, spans[], startedAt }
    this._defaultTrace = null;
    this._defaultTraceTimeout = null;
    this._spanQueue = [];
    this._flushTimer = null;
    this._flushInterval = sdk._flushInterval || 5000;
    this._batchSize = sdk._batchSize || 10;
  }

  /**
   * Start a named trace (groups related spans)
   * @param {string} name - Trace name
   * @param {string} [agent] - Agent name
   * @returns {string} traceId
   */
  startTrace(name, agent) {
    const traceId = `tr_${uid()}`;
    this._activeTraces.set(traceId, {
      name,
      agent: agent || null,
      spans: [],
      startedAt: new Date(),
      status: 'running',
    });
    if (this._sdk.debug) {
      console.log(`[AgentOS] Trace started: ${traceId} — ${name}`);
    }
    return traceId;
  }

  /**
   * End a trace and flush its spans
   * @param {string} traceId
   * @param {'success'|'error'} [status]
   */
  async endTrace(traceId, status = 'success') {
    const trace = this._activeTraces.get(traceId);
    if (!trace) return;

    trace.status = status;
    trace.endedAt = new Date();
    trace.durationMs = trace.endedAt - trace.startedAt;

    // Aggregate trace-level metrics from spans
    const totalTokens = trace.spans.reduce((s, sp) => s + (sp.total_tokens || 0), 0);
    const totalCost = trace.spans.reduce((s, sp) => s + (sp.cost_usd || 0), 0);

    const payload = {
      trace: {
        trace_id: traceId,
        name: trace.name,
        agent: trace.agent,
        status: trace.status,
        duration_ms: trace.durationMs,
        total_tokens: totalTokens,
        total_cost_usd: totalCost,
        span_count: trace.spans.length,
        started_at: trace.startedAt.toISOString(),
        ended_at: trace.endedAt.toISOString(),
      },
      spans: trace.spans,
    };

    this._activeTraces.delete(traceId);

    // Send to API
    await this._sendTracePayload(payload);

    if (this._sdk.debug) {
      console.log(`[AgentOS] Trace ended: ${traceId} — ${trace.spans.length} spans, ${totalTokens} tokens, $${totalCost.toFixed(4)}`);
    }
  }

  /**
   * Record a span (called by interceptors)
   * @param {Object} span - Span data
   * @param {string} [traceId] - Explicit trace to attach to
   */
  recordSpan(span, traceId) {
    // Resolve trace
    let targetTraceId = traceId;

    if (!targetTraceId) {
      // Find the most recent active trace
      const activeIds = [...this._activeTraces.keys()];
      if (activeIds.length > 0) {
        targetTraceId = activeIds[activeIds.length - 1];
      } else {
        // Create or reuse a default trace (auto-groups standalone calls)
        targetTraceId = this._getOrCreateDefaultTrace();
      }
    }

    const trace = this._activeTraces.get(targetTraceId);
    if (trace) {
      span.trace_id = targetTraceId;
      trace.spans.push(span);
    } else {
      // Orphan span — queue it directly
      span.trace_id = targetTraceId || `tr_orphan_${uid()}`;
      this._spanQueue.push(span);
      this._maybeFlushQueue();
    }
  }

  /** Get or create a default trace for ungrouped LLM calls */
  _getOrCreateDefaultTrace() {
    if (this._defaultTrace && this._activeTraces.has(this._defaultTrace)) {
      // Reset the auto-close timer
      if (this._defaultTraceTimeout) clearTimeout(this._defaultTraceTimeout);
      this._defaultTraceTimeout = setTimeout(() => this._closeDefaultTrace(), 30000);
      return this._defaultTrace;
    }

    const traceId = this.startTrace('auto-instrumented', null);
    this._defaultTrace = traceId;
    this._defaultTraceTimeout = setTimeout(() => this._closeDefaultTrace(), 30000);
    return traceId;
  }

  async _closeDefaultTrace() {
    if (this._defaultTrace) {
      const id = this._defaultTrace;
      this._defaultTrace = null;
      this._defaultTraceTimeout = null;
      await this.endTrace(id, 'success');
    }
  }

  _maybeFlushQueue() {
    if (this._spanQueue.length >= this._batchSize) {
      this._flushQueue();
    } else if (!this._flushTimer) {
      this._flushTimer = setTimeout(() => this._flushQueue(), this._flushInterval);
    }
  }

  async _flushQueue() {
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
    const batch = this._spanQueue.splice(0);
    if (batch.length === 0) return;

    // Group by trace_id
    const grouped = {};
    for (const span of batch) {
      const tid = span.trace_id;
      if (!grouped[tid]) grouped[tid] = [];
      grouped[tid].push(span);
    }

    for (const [traceId, spans] of Object.entries(grouped)) {
      const totalTokens = spans.reduce((s, sp) => s + (sp.total_tokens || 0), 0);
      const totalCost = spans.reduce((s, sp) => s + (sp.cost_usd || 0), 0);
      const startTime = spans.reduce((min, sp) => sp.started_at < min ? sp.started_at : min, spans[0].started_at);
      const endTime = spans.reduce((max, sp) => sp.ended_at > max ? sp.ended_at : max, spans[0].ended_at);

      await this._sendTracePayload({
        trace: {
          trace_id: traceId,
          name: 'auto-instrumented',
          agent: null,
          status: 'success',
          duration_ms: new Date(endTime) - new Date(startTime),
          total_tokens: totalTokens,
          total_cost_usd: totalCost,
          span_count: spans.length,
          started_at: startTime,
          ended_at: endTime,
        },
        spans,
      });
    }
  }

  async _sendTracePayload(payload) {
    return this._sdk._send('/traces/ingest', payload);
  }

  /** Flush everything on shutdown */
  async shutdown() {
    // Close all active traces
    for (const [id] of this._activeTraces) {
      await this.endTrace(id, 'success');
    }
    await this._flushQueue();
  }
}

// ── OpenAI Interceptor ──

const OPENAI_PATCHED = Symbol('agentos_openai_patched');

/**
 * Patch the OpenAI SDK to auto-capture chat completions
 * @param {TraceContext} ctx - Trace context
 * @param {Object} [options] - { capturePrompts: false }
 */
export function instrumentOpenAI(ctx, options = {}) {
  let OpenAI;
  try {
    OpenAI = (await_import('openai'))?.default || (await_import('openai'));
  } catch {
    if (ctx._sdk.debug) console.log('[AgentOS] OpenAI SDK not found — skipping instrumentation');
    return false;
  }

  if (!OpenAI) return false;

  // Find the Chat.Completions prototype
  let target;
  try {
    const instance = new OpenAI({ apiKey: 'dummy' });
    target = Object.getPrototypeOf(instance.chat.completions);
  } catch {
    if (ctx._sdk.debug) console.log('[AgentOS] Could not access OpenAI.Chat.Completions prototype');
    return false;
  }

  if (target[OPENAI_PATCHED]) {
    if (ctx._sdk.debug) console.log('[AgentOS] OpenAI already instrumented');
    return true;
  }

  const original = target.create;
  if (!original) return false;

  target.create = async function agentosWrappedCreate(...args) {
    const params = args[0] || {};
    const model = normalizeModel(params.model);
    const spanId = `sp_${uid()}`;
    const startedAt = new Date();

    try {
      const result = await original.apply(this, args);

      const endedAt = new Date();
      const latencyMs = endedAt - startedAt;

      // Handle streaming — result is an async iterator
      if (params.stream) {
        return wrapOpenAIStream(result, ctx, {
          spanId, model, startedAt, options,
        });
      }

      // Non-streaming response
      const usage = result.usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const totalTokens = usage.total_tokens || promptTokens + completionTokens;
      const costUsd = computeCost(model, promptTokens, completionTokens);

      ctx.recordSpan({
        span_id: spanId,
        provider: 'openai',
        model: params.model || model,
        type: 'chat.completions',
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        latency_ms: latencyMs,
        cost_usd: Math.round(costUsd * 1000000) / 1000000,
        status: 'success',
        error_message: null,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        metadata: {
          ...(options.capturePrompts ? { messages: params.messages?.length } : {}),
          temperature: params.temperature,
          max_tokens: params.max_tokens,
          finish_reason: result.choices?.[0]?.finish_reason,
        },
      });

      return result;
    } catch (error) {
      const endedAt = new Date();
      ctx.recordSpan({
        span_id: spanId,
        provider: 'openai',
        model: params.model || model,
        type: 'chat.completions',
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        latency_ms: endedAt - startedAt,
        cost_usd: 0,
        status: 'error',
        error_message: error.message?.slice(0, 500),
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        metadata: { error_type: error.constructor?.name },
      });
      throw error;
    }
  };

  target[OPENAI_PATCHED] = true;
  if (ctx._sdk.debug) console.log('[AgentOS] ✅ OpenAI instrumented');
  return true;
}

/** Wrap an OpenAI streaming response to capture aggregated metrics */
function wrapOpenAIStream(stream, ctx, meta) {
  const chunks = [];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  const originalIterator = stream[Symbol.asyncIterator]
    ? stream[Symbol.asyncIterator].bind(stream)
    : null;

  if (!originalIterator) return stream;

  const wrappedStream = {
    ...stream,
    [Symbol.asyncIterator]() {
      const iter = originalIterator();
      return {
        async next() {
          const result = await iter.next();
          if (!result.done) {
            const chunk = result.value;
            chunks.push(chunk);
            // Accumulate usage from final chunk if available
            if (chunk.usage) {
              totalPromptTokens = chunk.usage.prompt_tokens || totalPromptTokens;
              totalCompletionTokens = chunk.usage.completion_tokens || totalCompletionTokens;
            }
          } else {
            // Stream ended — record span
            const endedAt = new Date();
            const totalTokens = totalPromptTokens + totalCompletionTokens;
            const costUsd = computeCost(meta.model, totalPromptTokens, totalCompletionTokens);

            ctx.recordSpan({
              span_id: meta.spanId,
              provider: 'openai',
              model: meta.model,
              type: 'chat.completions.stream',
              prompt_tokens: totalPromptTokens,
              completion_tokens: totalCompletionTokens,
              total_tokens: totalTokens,
              latency_ms: endedAt - meta.startedAt,
              cost_usd: Math.round(costUsd * 1000000) / 1000000,
              status: 'success',
              error_message: null,
              started_at: meta.startedAt.toISOString(),
              ended_at: endedAt.toISOString(),
              metadata: { streamed: true, chunk_count: chunks.length },
            });
          }
          return result;
        },
      };
    },
  };

  // Preserve other stream methods
  if (stream.controller) wrappedStream.controller = stream.controller;
  if (stream.toReadableStream) wrappedStream.toReadableStream = stream.toReadableStream.bind(stream);

  return wrappedStream;
}

// ── Anthropic Interceptor ──

const ANTHROPIC_PATCHED = Symbol('agentos_anthropic_patched');

/**
 * Patch the Anthropic SDK to auto-capture message creations
 * @param {TraceContext} ctx - Trace context
 * @param {Object} [options]
 */
export function instrumentAnthropic(ctx, options = {}) {
  let Anthropic;
  try {
    Anthropic = (await_import('@anthropic-ai/sdk'))?.default || (await_import('@anthropic-ai/sdk'));
  } catch {
    if (ctx._sdk.debug) console.log('[AgentOS] Anthropic SDK not found — skipping instrumentation');
    return false;
  }

  if (!Anthropic) return false;

  let target;
  try {
    const instance = new Anthropic({ apiKey: 'dummy' });
    target = Object.getPrototypeOf(instance.messages);
  } catch {
    if (ctx._sdk.debug) console.log('[AgentOS] Could not access Anthropic.Messages prototype');
    return false;
  }

  if (target[ANTHROPIC_PATCHED]) {
    if (ctx._sdk.debug) console.log('[AgentOS] Anthropic already instrumented');
    return true;
  }

  const original = target.create;
  if (!original) return false;

  target.create = async function agentosWrappedCreate(...args) {
    const params = args[0] || {};
    const model = normalizeModel(params.model);
    const spanId = `sp_${uid()}`;
    const startedAt = new Date();

    try {
      const result = await original.apply(this, args);
      const endedAt = new Date();
      const latencyMs = endedAt - startedAt;

      // Handle streaming
      if (params.stream) {
        return wrapAnthropicStream(result, ctx, {
          spanId, model: params.model || model, startedAt, options,
        });
      }

      // Non-streaming
      const usage = result.usage || {};
      const promptTokens = usage.input_tokens || 0;
      const completionTokens = usage.output_tokens || 0;
      const totalTokens = promptTokens + completionTokens;
      const costUsd = computeCost(model, promptTokens, completionTokens);

      ctx.recordSpan({
        span_id: spanId,
        provider: 'anthropic',
        model: params.model || model,
        type: 'messages.create',
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        latency_ms: latencyMs,
        cost_usd: Math.round(costUsd * 1000000) / 1000000,
        status: result.stop_reason === 'error' ? 'error' : 'success',
        error_message: null,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        metadata: {
          ...(options.capturePrompts ? { message_count: params.messages?.length } : {}),
          max_tokens: params.max_tokens,
          stop_reason: result.stop_reason,
          model_returned: result.model,
        },
      });

      return result;
    } catch (error) {
      const endedAt = new Date();
      ctx.recordSpan({
        span_id: spanId,
        provider: 'anthropic',
        model: params.model || model,
        type: 'messages.create',
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        latency_ms: endedAt - startedAt,
        cost_usd: 0,
        status: 'error',
        error_message: error.message?.slice(0, 500),
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        metadata: { error_type: error.constructor?.name },
      });
      throw error;
    }
  };

  target[ANTHROPIC_PATCHED] = true;
  if (ctx._sdk.debug) console.log('[AgentOS] ✅ Anthropic instrumented');
  return true;
}

/** Wrap an Anthropic streaming response */
function wrapAnthropicStream(stream, ctx, meta) {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const originalIterator = stream[Symbol.asyncIterator]
    ? stream[Symbol.asyncIterator].bind(stream)
    : null;

  if (!originalIterator) return stream;

  const wrappedStream = {
    ...stream,
    [Symbol.asyncIterator]() {
      const iter = originalIterator();
      return {
        async next() {
          const result = await iter.next();
          if (!result.done) {
            const event = result.value;
            // Anthropic streams message_start with usage
            if (event.type === 'message_start' && event.message?.usage) {
              totalInputTokens = event.message.usage.input_tokens || 0;
            }
            if (event.type === 'message_delta' && event.usage) {
              totalOutputTokens = event.usage.output_tokens || 0;
            }
          } else {
            // Stream done
            const endedAt = new Date();
            const totalTokens = totalInputTokens + totalOutputTokens;
            const costUsd = computeCost(meta.model, totalInputTokens, totalOutputTokens);

            ctx.recordSpan({
              span_id: meta.spanId,
              provider: 'anthropic',
              model: meta.model,
              type: 'messages.create.stream',
              prompt_tokens: totalInputTokens,
              completion_tokens: totalOutputTokens,
              total_tokens: totalTokens,
              latency_ms: endedAt - meta.startedAt,
              cost_usd: Math.round(costUsd * 1000000) / 1000000,
              status: 'success',
              error_message: null,
              started_at: meta.startedAt.toISOString(),
              ended_at: endedAt.toISOString(),
              metadata: { streamed: true },
            });
          }
          return result;
        },
      };
    },
  };

  return wrappedStream;
}

// ── Dynamic Import Helper ──
// We use synchronous require fallback for CJS compatibility
function await_import(mod) {
  try {
    // Try require first (CommonJS environments, faster)
    return require(mod);
  } catch {
    // Module not installed — that's fine
    return null;
  }
}

// ── Exports ──

export { PRICING, computeCost, normalizeModel, uid };
