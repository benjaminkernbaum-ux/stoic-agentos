/**
 * Anthropic Auto-Instrumentor
 * Patches Anthropic client to capture messages.create() calls
 */

import { estimateCost } from '../pricing.js';
import { getActiveTrace } from '../trace.js';
import { AgentOSError, AgentOSCircuitBreakerError, AgentOSPolicyBlockError } from '../index.js';

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
    let finalParams = params;

    // ── Local Circuit Breaker Check ──
    if (sdk.localCircuitBreaker?.enabled) {
      let chars = 0;
      if (Array.isArray(params.messages)) {
        params.messages.forEach(m => {
          if (typeof m.content === 'string') chars += m.content.length;
          else if (Array.isArray(m.content)) {
            m.content.forEach(c => {
              if (c.text) chars += c.text.length;
            });
          }
        });
      }
      const estTokens = Math.ceil(chars / 4);
      try {
        sdk.localCircuitBreaker.check(estTokens);
      } catch (err) {
        throw new AgentOSCircuitBreakerError(err.message);
      }
    }

    if (sdk.autoRecall && Array.isArray(params.messages) && params.messages.length > 0) {
      try {
        const messages = params.messages;
        const userMessages = messages.filter(m => m.role === 'user');
        const lastUserMessage = userMessages[userMessages.length - 1];
        const queryText = typeof lastUserMessage?.content === 'string'
          ? lastUserMessage.content
          : Array.isArray(lastUserMessage?.content)
            ? lastUserMessage.content.map(c => c.text || c.content || '').join(' ')
            : '';

        if (queryText) {
          const memories = await sdk.memory.searchEpisodes(queryText, { limit: 3, matchThreshold: 0.3 });
          if (Array.isArray(memories) && memories.length > 0) {
            const memoryContext = memories.map(m => `- ${m.content}`).join('\n');
            const systemPrefix = `[Recall context from past sessions:\n${memoryContext}\nUse this historical context to ground your answer if relevant.]`;
            
            let system = params.system;
            if (typeof system === 'string') {
              system = `${systemPrefix}\n\n${system}`;
            } else if (Array.isArray(system)) {
              system = [{ type: 'text', text: systemPrefix }, ...system];
            } else {
              system = systemPrefix;
            }

            finalParams = {
              ...params,
              system
            };
          }
        }
      } catch (err) {
        if (sdk.debug) console.warn('[AgentOS] Auto-recall failed:', err.message);
      }
    }

    try {
      const result = await originalCreate(finalParams, options);
      const latencyMs = Date.now() - startTime;

      const usage = result.usage || {};
      const promptTokens = usage.input_tokens || 0;
      const completionTokens = usage.output_tokens || 0;
      const totalTokens = promptTokens + completionTokens;
      const costUsd = estimateCost(model, promptTokens, completionTokens);

      // ── Policy-Driven Interception (server-side Shield policies + HITL) ──
      // Every tool_use block is checked against the org's declarative policies
      // via /shield/evaluate; tools pinned in sdk.criticalTools force approval
      // regardless of server policies (client-side override, back-compat).
      if (sdk.activeShield && Array.isArray(result.content)) {
        const toolBlocks = result.content.filter(b => b.type === 'tool_use');
        for (const block of toolBlocks) {
          const activeTrace = getActiveTrace();
          if (sdk.debug) console.log(`[AgentOS Shield] Evaluating tool "${block.name}" against Shield policies...`);
          const decision = await sdk.compliance.enforce(block.name, {
            agentId: activeTrace?.agent || null,
            traceId: activeTrace?.traceId || null,
            toolArgs: block.input || {},
            forceEscalate: sdk.criticalTools.includes(block.name),
          });

          if (!decision.allowed) {
            if (sdk.debug) console.warn(`[AgentOS Shield] ❌ Tool "${block.name}" denied (${decision.reason}).`);
            // Gateway failures under failClosed always throw — a refusal message
            // would mask an outage as a human decision.
            if (decision.reason === 'gateway_error') {
              throw new AgentOSPolicyBlockError(`HITL Shield validation failed: compliance gateway unreachable (failClosed).`);
            }
            if (sdk.rejectionBehavior === 'throw') {
              throw new AgentOSPolicyBlockError(`Tool execution blocked: Action "${block.name}" was denied (${decision.reason}).`);
            }
            return {
              ...result,
              content: [
                {
                  type: 'text',
                  text: `Ação bloqueada: O Shield negou a execução da ferramenta "${block.name}" (${decision.reason}).`
                }
              ]
            };
          }
          if (sdk.debug) console.log(`[AgentOS Shield] ✅ Tool "${block.name}" allowed (${decision.reason}).`);
        }
      }

      // Record in local circuit breaker
      if (sdk.localCircuitBreaker?.enabled) {
        sdk.localCircuitBreaker.record(totalTokens);
      }

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
        // Send as standalone trace via background queue
        const payload = {
          trace: {
            trace_id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: `anthropic:${model}`,
            status: 'success',
            duration_ms: latencyMs,
            total_tokens: totalTokens,
            total_cost_usd: costUsd,
          },
          spans: [span],
        };
        if (sdk.backgroundQueue) {
          sdk.backgroundQueue.enqueue('/traces/ingest', payload);
        } else {
          sdk._send('/traces/ingest', payload).catch(() => {});
        }
      }

      return result;
    } catch (error) {
      if (error instanceof AgentOSError) throw error;
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
        const payload = {
          trace: {
            trace_id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: `anthropic:${model}:error`,
            status: 'error',
            duration_ms: latencyMs,
            total_tokens: 0,
            total_cost_usd: 0,
          },
          spans: [span],
        };
        if (sdk.backgroundQueue) {
          sdk.backgroundQueue.enqueue('/traces/ingest', payload);
        } else {
          sdk._send('/traces/ingest', payload).catch(() => {});
        }
      }

      throw error;
    }
  };

  if (sdk.debug) console.log('[AgentOS] ✅ Anthropic client instrumented');
}
