/**
 * Trace Context — groups related LLM calls
 * Uses crypto.randomUUID for trace IDs
 */

export class Trace {
  constructor(sdk, name, options = {}) {
    this._sdk = sdk;
    this.traceId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `tr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    this.name = name;
    this.agent = options.agent || null;
    this.spans = [];
    this.status = 'running';
    this.startedAt = Date.now();
    this.metadata = options.metadata || {};
  }

  /**
   * Add a span (LLM call result) to this trace
   */
  addSpan(span) {
    this.spans.push({
      span_id: span.span_id || `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      provider: span.provider || 'unknown',
      model: span.model || 'unknown',
      type: span.type || 'chat.completions',
      prompt_tokens: span.prompt_tokens || 0,
      completion_tokens: span.completion_tokens || 0,
      total_tokens: span.total_tokens || (span.prompt_tokens || 0) + (span.completion_tokens || 0),
      latency_ms: span.latency_ms || 0,
      cost_usd: span.cost_usd || 0,
      status: span.status || 'success',
      error_message: span.error_message || null,
      metadata: span.metadata || {},
      started_at: span.started_at || new Date().toISOString(),
      ended_at: span.ended_at || new Date().toISOString(),
    });
  }

  /**
   * End the trace and send to API
   * @param {'success'|'error'} [status]
   */
  async end(status) {
    this.status = status || (this.spans.some(s => s.status === 'error') ? 'error' : 'success');
    const duration = Date.now() - this.startedAt;

    const totalTokens = this.spans.reduce((s, sp) => s + sp.total_tokens, 0);
    const totalCost = this.spans.reduce((s, sp) => s + sp.cost_usd, 0);

    const payload = {
      trace: {
        trace_id: this.traceId,
        name: this.name,
        agent: this.agent,
        status: this.status,
        duration_ms: duration,
        total_tokens: totalTokens,
        total_cost_usd: Math.round(totalCost * 1_000_000) / 1_000_000,
        metadata: this.metadata,
        started_at: new Date(this.startedAt).toISOString(),
        ended_at: new Date().toISOString(),
      },
      spans: this.spans,
    };

    if (this._sdk.backgroundQueue) {
      this._sdk.backgroundQueue.enqueue('/traces/ingest', payload);
      return Promise.resolve({ success: true, queued: true });
    }
    return this._sdk._send('/traces/ingest', payload);
  }
}

// ── Global trace context (for auto-instrumentation) ──
let _activeTrace = null;

export function setActiveTrace(trace) {
  _activeTrace = trace;
}

export function getActiveTrace() {
  return _activeTrace;
}

export function clearActiveTrace() {
  _activeTrace = null;
}
