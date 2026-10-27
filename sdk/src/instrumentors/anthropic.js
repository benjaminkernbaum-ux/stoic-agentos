/**
 * Anthropic Auto-Instrumentor
 * Patches Anthropic client to capture messages.create() calls
 */

import { estimateCost } from '../pricing.js';
import { getActiveTrace } from '../trace.js';
import { AgentOSError, AgentOSCircuitBreakerError, AgentOSPolicyBlockError } from '../index.js';
import { enforceToolPolicy } from './shieldEnforce.js';

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

      // ── Server-side Policy Engine (Active Shield L1–L3), opt-in via policyShield ──
      // Asks the server for a graduated verdict per tool_use block. Runs before the
      // static critical-tool HITL below; a BLOCK / rejected-approval short-circuits here.
      if (sdk.activeShield && sdk.policyShield && Array.isArray(result.content)) {
        const activeTrace = getActiveTrace();
        for (const block of result.content) {
          if (block.type !== 'tool_use' || !block.name) continue;
          try {
            const { allowed, verdict } = await enforceToolPolicy(sdk, block.name, block.input || {}, {
              agentId: activeTrace?.agent || null,
              traceId: activeTrace?.traceId || null,
            });
            if (!allowed) {
              if (sdk.debug) console.warn(`[AgentOS Shield] ⛔ Policy ${verdict} for tool "${block.name}".`);
              if (sdk.rejectionBehavior === 'throw') {
                throw new AgentOSPolicyBlockError(`Tool execution blocked: Action "${block.name}" denied by policy (${verdict}).`);
              }
              return {
                ...result,
                content: [{ type: 'text', text: `Action blocked: policy denied execution of "${block.name}".` }]
              };
            }
          } catch (err) {
            if (err instanceof AgentOSError) throw err;
            if (sdk.failClosed) {
              throw new AgentOSPolicyBlockError(`Shield policy validation failed: ${err.message}`);
            }
            if (sdk.debug) console.warn('[AgentOS Shield] policy check failed (fail-open, proceeding):', err.message);
          }
        }
      }

      // ── Human-in-the-Loop Interception ──
      let isCritical = false;
      let criticalToolName = '';
      let criticalToolArgs = {};
      if (sdk.activeShield && Array.isArray(result.content)) {
        for (const block of result.content) {
          if (block.type === 'tool_use' && sdk.criticalTools.includes(block.name)) {
            isCritical = true;
            criticalToolName = block.name;
            criticalToolArgs = block.input;
            break;
          }
        }
      }

      if (isCritical) {
        try {
          const activeTrace = getActiveTrace();
          const suspendRes = await sdk.compliance.suspend(criticalToolName, {
            agentId: activeTrace?.agent || null,
            traceId: activeTrace?.traceId || null,
            toolArgs: criticalToolArgs || {},
          });

          if (suspendRes && suspendRes.approval_id) {
            const approvalId = suspendRes.approval_id;
            if (sdk.debug) console.log(`[AgentOS Shield] ⏸️ Execution suspended. Awaiting approval for tool "${criticalToolName}" (ID: ${approvalId})...`);

            const pollInterval = 2000;
            const maxPollAttempts = 150; // 5 min timeout
            let attempts = 0;
            let approved = false;

            while (attempts < maxPollAttempts) {
              await new Promise(r => setTimeout(r, pollInterval));
              attempts++;
              try {
                const statusRes = await sdk.compliance.checkApprovalStatus(approvalId);
                if (statusRes && statusRes.status) {
                  if (statusRes.status === 'APPROVED') {
                    try {
                      const consumeRes = await sdk.compliance.consumeApproval(approvalId);
                      if (consumeRes && consumeRes.success) {
                        approved = true;
                      } else {
                        approved = false;
                      }
                    } catch (consumeErr) {
                      approved = false;
                      if (sdk.debug) console.warn(`[AgentOS Shield] Failed to claim/consume approved ticket:`, consumeErr.message);
                    }
                    break;
                  } else if (statusRes.status === 'REJECTED') {
                    approved = false;
                    break;
                  }
                }
              } catch (pollErr) {
                if (sdk.debug) console.warn(`[AgentOS Shield] Transient polling error (will retry):`, pollErr.message);
              }
            }

            if (!approved) {
              if (sdk.debug) console.warn(`[AgentOS Shield] ❌ Tool "${criticalToolName}" REJECTED or TIMED OUT.`);
              if (sdk.rejectionBehavior === 'throw') {
                throw new AgentOSPolicyBlockError(`Tool execution blocked: Action "${criticalToolName}" was rejected by policy/administrator.`);
              } else {
                const refusedResult = {
                  ...result,
                  content: [
                    {
                      type: 'text',
                      text: `Ação bloqueada: O administrador do sistema rejeitou a execução da ferramenta "${criticalToolName}".`
                    }
                  ]
                };
                return refusedResult;
              }
            }
            if (sdk.debug) console.log(`[AgentOS Shield] ✅ Tool "${criticalToolName}" APPROVED. Resuming.`);
          } else {
            if (sdk.failClosed) {
              throw new AgentOSPolicyBlockError(`HITL Shield validation failed: Invalid response from compliance gateway.`);
            }
          }
        } catch (err) {
          if (err instanceof AgentOSError) throw err;
          if (sdk.failClosed) {
            throw new AgentOSPolicyBlockError(`HITL Shield validation failed: ${err.message}`);
          } else {
            if (sdk.debug) {
              console.warn(`[AgentOS Shield] HITL Shield validation failed (Fail-Open active, proceeding):`, err.message);
            }
          }
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
