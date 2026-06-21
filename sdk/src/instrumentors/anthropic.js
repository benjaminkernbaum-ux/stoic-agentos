/**
 * Anthropic Auto-Instrumentor
 * Patches Anthropic client to capture messages.create() calls
 */

import { estimateCost } from '../pricing.js';
import { getActiveTrace } from '../trace.js';

/**
 * Instrument an Anthropic client instance
 * @param {object} anthropicClient - An Anthropic client instance
 * @param {object} sdk - AgentOS SDK instance
 */
export function instrumentAnthropicClient(anthropicClient, sdk) {
  if (!anthropicClient?.messages?.create) {
    if (sdk.debug) console.warn('[AgentOS] Anthropic client has no messages.create method');
    return;
  }

  const originalCreate = anthropicClient.messages.create.bind(anthropicClient.messages);

  anthropicClient.messages.create = async function instrumentedCreate(params, options) {
    const startTime = Date.now();
    const model = params.model || 'unknown';

    try {
      const result = await originalCreate(params, options);
      const latencyMs = Date.now() - startTime;

      const usage = result.usage || {};
      const promptTokens = usage.input_tokens || 0;
      const completionTokens = usage.output_tokens || 0;
      const totalTokens = promptTokens + completionTokens;
      const costUsd = estimateCost(model, promptTokens, completionTokens);

      const span = {
        span_id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        provider: 'anthropic',
        model,
        type: 'messages.create',
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        latency_ms: latencyMs,
        cost_usd: costUsd,
        status: 'success',
        started_at: new Date(startTime).toISOString(),
        ended_at: new Date().toISOString(),
      };

      const activeTrace = getActiveTrace();
      if (activeTrace) {
        activeTrace.addSpan(span);
      } else {
        // Send as standalone trace via ingest endpoint (accepts trace + spans)
        sdk._send('/traces/ingest', {
          trace: {
            trace_id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: `anthropic:${model}`,
            status: 'success',
            duration_ms: latencyMs,
            total_tokens: totalTokens,
            total_cost_usd: costUsd,
          },
          spans: [span],
        }).catch(() => {});
      }

      return result;
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      const span = {
        span_id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        provider: 'anthropic',
        model,
        type: 'messages.create',
        latency_ms: latencyMs,
        cost_usd: 0,
        status: 'error',
        error_message: error.message,
        started_at: new Date(startTime).toISOString(),
        ended_at: new Date().toISOString(),
      };

      const activeTrace = getActiveTrace();
      if (activeTrace) {
        activeTrace.addSpan(span);
      } else {
        // Send as standalone error trace via ingest endpoint
        sdk._send('/traces/ingest', {
          trace: {
            trace_id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: `anthropic:${model}:error`,
            status: 'error',
            duration_ms: latencyMs,
            total_tokens: 0,
            total_cost_usd: 0,
          },
          spans: [span],
        }).catch(() => {});
      }

      throw error;
    }
  };

  if (sdk.debug) console.log('[AgentOS] ✅ Anthropic client instrumented');
}
