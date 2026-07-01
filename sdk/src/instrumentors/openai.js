/**
 * OpenAI Auto-Instrumentor
 * Monkey-patches OpenAI client to automatically capture LLM calls
 * 
 * Usage:
 *   import { AgentOS } from 'stoic-agentos-sdk';
 *   const os = new AgentOS({ apiKey: 'sk_live_...' });
 *   os.instrument('openai');
 *   // All openai.chat.completions.create() calls are now auto-captured
 */

import { estimateCost } from '../pricing.js';
import { getActiveTrace } from '../trace.js';
import { AgentOSError, AgentOSCircuitBreakerError, AgentOSPolicyBlockError } from '../index.js';

let _patched = false;

export function instrumentOpenAI(sdk) {
  if (_patched) return;

  try {
    // Dynamically detect the openai module
    const openaiModule = _tryRequireOpenAI();
    if (!openaiModule) {
      if (sdk.debug) console.log('[AgentOS] OpenAI package not found — skipping instrumentation');
      return;
    }

    const OpenAI = openaiModule.default || openaiModule;
    const OriginalCreate = findCreateMethod(OpenAI);

    if (!OriginalCreate) {
      if (sdk.debug) console.warn('[AgentOS] Could not find chat.completions.create to patch');
      return;
    }

    // Patch the prototype
    const proto = OpenAI.prototype;
    const origInit = proto.constructor;

    // We need to patch instances, so we wrap the chat.completions.create at instance level
    const origChatGetter = Object.getOwnPropertyDescriptor(proto, 'chat');
    
    // Strategy: Patch at post-construction by wrapping the constructor
    const OriginalOpenAI = OpenAI;
    
    // Use a Proxy on the OpenAI constructor to intercept instances
    const patchedNew = new Proxy(OriginalOpenAI, {
      construct(target, args) {
        const instance = new target(...args);
        patchInstance(instance, sdk);
        return instance;
      },
    });

    // Replace the export if possible
    if (openaiModule.default) {
      openaiModule.default = patchedNew;
    }

    // Also patch any existing instances by wrapping the prototype method
    patchPrototype(OpenAI, sdk);

    _patched = true;
    if (sdk.debug) console.log('[AgentOS] ✅ OpenAI auto-instrumentation active');
  } catch (err) {
    if (sdk.debug) console.warn('[AgentOS] OpenAI instrumentation failed:', err.message);
  }
}

function patchInstance(instance, sdk) {
  if (!instance.chat?.completions?.create) return;

  const originalCreate = instance.chat.completions.create.bind(instance.chat.completions);

  instance.chat.completions.create = async function instrumentedCreate(params, options) {
    const startTime = Date.now();
    const model = params.model || 'unknown';
    let finalParams = params;

    // ── Local Circuit Breaker Check ──
    if (sdk.localCircuitBreaker?.enabled) {
      let chars = 0;
      if (Array.isArray(params.messages)) {
        params.messages.forEach(m => {
          if (typeof m.content === 'string') chars += m.content.length;
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
            const systemMsg = {
              role: 'system',
              content: `[Recall context from past sessions:\n${memoryContext}\nUse this historical context to ground your answer if relevant.]`
            };
            finalParams = {
              ...params,
              messages: [systemMsg, ...messages]
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

      // Extract token usage
      const usage = result.usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const totalTokens = usage.total_tokens || promptTokens + completionTokens;
      const costUsd = estimateCost(model, promptTokens, completionTokens);

      // ── Human-in-the-Loop Interception ──
      let isCritical = false;
      let criticalToolName = '';
      let criticalToolArgs = {};
      if (sdk.activeShield && Array.isArray(result.choices?.[0]?.message?.tool_calls)) {
        for (const tc of result.choices[0].message.tool_calls) {
          if (sdk.criticalTools.includes(tc.function?.name)) {
            isCritical = true;
            criticalToolName = tc.function.name;
            criticalToolArgs = tc.function.arguments;
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
            toolArgs: typeof criticalToolArgs === 'string' ? JSON.parse(criticalToolArgs) : criticalToolArgs,
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
                    approved = true;
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
                  choices: result.choices.map(c => ({
                    ...c,
                    message: {
                      ...c.message,
                      content: `Ação bloqueada: O administrador do sistema rejeitou a execução da ferramenta "${criticalToolName}".`,
                      tool_calls: null
                    }
                  }))
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
        provider: 'openai',
        model,
        type: 'chat.completions',
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        latency_ms: latencyMs,
        cost_usd: costUsd,
        status: 'success',
        started_at: new Date(startTime).toISOString(),
        ended_at: new Date().toISOString(),
      };

      // Attach to active trace if one exists
      const activeTrace = getActiveTrace();
      if (activeTrace) {
        activeTrace.addSpan(span);
      } else {
        // No active trace — send as standalone trace in background queue
        const payload = {
          trace: {
            trace_id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: `openai:${model}`,
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
        provider: 'openai',
        model,
        type: 'chat.completions',
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
            name: `openai:${model}:error`,
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

      throw error; // Re-throw
    }
  };
}

function patchPrototype(OpenAI, sdk) {
  // Store reference for future instances to also be patched
  const originalConstructor = OpenAI.prototype.constructor;
  const origBuild = OpenAI.prototype._buildClient || OpenAI.prototype.constructor;
  
  // Mark the class so we can patch new instances
  OpenAI._agentosSDK = sdk;
  OpenAI._agentosPatchInstance = patchInstance;
}

function findCreateMethod(OpenAI) {
  try {
    const instance = Object.create(OpenAI.prototype);
    return instance?.chat?.completions?.create;
  } catch {
    return null;
  }
}

function _tryRequireOpenAI() {
  // Dynamic import for ESM
  return null; // Will be called via dynamic import in the main instrument() method
}

/**
 * Instrument an OpenAI instance directly (preferred method)
 * @param {object} openaiClient - An OpenAI client instance
 * @param {object} sdk - AgentOS SDK instance
 */
export function instrumentOpenAIClient(openaiClient, sdk) {
  patchInstance(openaiClient, sdk);
  if (sdk.debug) console.log('[AgentOS] ✅ OpenAI client instrumented');
}
