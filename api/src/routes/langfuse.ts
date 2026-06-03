/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Langfuse Integration (Trace Import)
 * ═══════════════════════════════════════════════════════
 *  Converts Langfuse-format traces into native Stoic AgentOS
 *  traces + spans, enabling migration from Langfuse or
 *  dual-write observability.
 *
 *  Endpoints:
 *    POST /api/v1/integrations/langfuse/import        Import a single trace
 *    POST /api/v1/integrations/langfuse/import/batch   Import multiple traces
 */

import { Router } from 'express';
import type { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { supabase } from '../middleware/db.js';
import { calculateCost } from '../middleware/cost.js';
import { safeError } from '../lib/safeError.js';
import type { AuthenticatedRequest } from '../types.js';
import { incrementCounter } from '../lib/counterCache.js';

const router = Router();
const API_VERSION = 'v1';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface LangfuseUsage {
  promptTokens?: number;
  completionTokens?: number;
}

interface LangfuseObservation {
  id?: string;
  type?: string;
  name?: string;
  model?: string;
  modelParameters?: Record<string, unknown>;
  input?: unknown;
  output?: unknown;
  usage?: LangfuseUsage;
  startTime?: string;
  endTime?: string;
  metadata?: Record<string, unknown>;
}

interface LangfuseTrace {
  id?: string;
  name?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  observations?: LangfuseObservation[];
}

/**
 * Guess provider from model name (Langfuse traces don't always include provider)
 */
function guessProvider(model: string): string {
  const m = model.toLowerCase();
  if (m.includes('gpt') || m.includes('o1') || m.includes('o3') || m.includes('o4')) return 'openai';
  if (m.includes('claude')) return 'anthropic';
  if (m.includes('gemini')) return 'google';
  if (m.includes('mistral') || m.includes('codestral')) return 'mistral';
  if (m.includes('deepseek')) return 'deepseek';
  if (m.includes('command')) return 'cohere';
  return 'unknown';
}

/**
 * Calculate latency in ms from start/end ISO strings.
 * Returns null if either timestamp is missing.
 */
function calcLatency(startTime?: string, endTime?: string): number | null {
  if (!startTime || !endTime) return null;
  const diff = new Date(endTime).getTime() - new Date(startTime).getTime();
  return diff >= 0 ? diff : null;
}

/**
 * Import a single Langfuse trace into Stoic AgentOS.
 * Returns the created trace summary or throws.
 */
async function importSingleTrace(
  trace: LangfuseTrace,
  orgId: string
): Promise<{
  langfuse_trace_id: string;
  trace_id: string;
  db_id: string;
  spans_imported: number;
  total_tokens: number;
  total_cost_usd: number;
}> {
  if (!trace.name) {
    throw new Error('Langfuse trace must have a name');
  }

  const observations = trace.observations || [];
  const generations = observations.filter((o) => o.type === 'GENERATION');

  // ── Build span rows + compute totals ──
  let computedTotalTokens = 0;
  let computedTotalCost = 0;
  const spanRows: Record<string, unknown>[] = [];

  for (const obs of generations) {
    const promptTokens = obs.usage?.promptTokens || 0;
    const completionTokens = obs.usage?.completionTokens || 0;
    const totalTokens = promptTokens + completionTokens;
    const model = obs.model || 'unknown';
    const provider = guessProvider(model);
    const costUsd = calculateCost(provider, model, promptTokens, completionTokens);
    const latencyMs = calcLatency(obs.startTime, obs.endTime);

    computedTotalTokens += totalTokens;
    computedTotalCost += costUsd;

    spanRows.push({
      org_id: orgId,
      // trace_id will be set after trace insert
      span_id: `sp_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      provider,
      model,
      type: 'chat.completions',
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      latency_ms: latencyMs,
      cost_usd: costUsd,
      status: 'success',
      error_message: null,
      metadata: {
        ...(obs.metadata || {}),
        imported_from: 'langfuse',
        langfuse_observation_id: obs.id || null,
        langfuse_observation_name: obs.name || null,
        model_parameters: obs.modelParameters || null,
      },
      started_at: obs.startTime || new Date().toISOString(),
      ended_at: obs.endTime || new Date().toISOString(),
    });
  }

  // ── Calculate trace duration from first/last observation ──
  const allTimes = observations
    .flatMap((o) => [o.startTime, o.endTime])
    .filter(Boolean)
    .map((t) => new Date(t!).getTime());
  const traceStarted = allTimes.length > 0 ? new Date(Math.min(...allTimes)).toISOString() : new Date().toISOString();
  const traceEnded = allTimes.length > 0 ? new Date(Math.max(...allTimes)).toISOString() : null;
  const durationMs = allTimes.length >= 2 ? Math.max(...allTimes) - Math.min(...allTimes) : null;

  // ── Build trace metadata ──
  const traceMetadata: Record<string, unknown> = {
    ...(trace.metadata || {}),
    imported_from: 'langfuse',
    langfuse_trace_id: trace.id || null,
  };
  if (trace.userId) traceMetadata.langfuse_user_id = trace.userId;
  if (trace.sessionId) traceMetadata.langfuse_session_id = trace.sessionId;

  const stoicTraceId = `tr_lf_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

  // ── Insert trace ──
  const { data: insertedTrace, error: traceErr } = await supabase!
    .from('traces')
    .insert({
      org_id: orgId,
      trace_id: stoicTraceId,
      name: trace.name,
      agent: null,
      status: traceEnded ? 'success' : 'running',
      duration_ms: durationMs,
      total_tokens: computedTotalTokens,
      total_cost_usd: parseFloat(computedTotalCost.toFixed(6)),
      span_count: spanRows.length,
      started_at: traceStarted,
      ended_at: traceEnded,
      metadata: traceMetadata,
    })
    .select('id')
    .single();

  if (traceErr) throw traceErr;
  const traceDbId = insertedTrace.id;

  // ── Insert spans ──
  if (spanRows.length > 0) {
    const rows = spanRows.map((s) => ({ ...s, trace_id: traceDbId }));
    const { error: spanErr } = await supabase!.from('spans').insert(rows);
    if (spanErr) {
      console.error('Langfuse span insert error:', spanErr.message);
      // Non-fatal — trace was already created
    }
  }

  // Bump cached counter
  incrementCounter(orgId, 'traces');

  return {
    langfuse_trace_id: trace.id || 'unknown',
    trace_id: stoicTraceId,
    db_id: traceDbId,
    spans_imported: spanRows.length,
    total_tokens: computedTotalTokens,
    total_cost_usd: parseFloat(computedTotalCost.toFixed(6)),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SINGLE TRACE IMPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * POST /api/v1/integrations/langfuse/import — Import a single Langfuse trace
 *
 * Body: { id, name, userId?, sessionId?, metadata?, observations[] }
 */
router.post(
  `/api/${API_VERSION}/integrations/langfuse/import`,
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const trace = req.body as LangfuseTrace;

      if (!trace.name) {
        return res.status(400).json({ error: 'name is required in the Langfuse trace' });
      }

      const result = await importSingleTrace(trace, req.org.id);

      console.log(`📦 Langfuse trace imported: ${result.langfuse_trace_id} → ${result.trace_id} — ${result.spans_imported} spans, ${result.total_tokens} tokens, $${result.total_cost_usd.toFixed(4)}`);

      res.status(201).json({
        message: 'Langfuse trace imported successfully',
        ...result,
      });
    } catch (err: unknown) {
      console.error('Langfuse import error:', (err as Error).message);
      safeError(res, err);
    }
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BATCH TRACE IMPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * POST /api/v1/integrations/langfuse/import/batch — Import multiple Langfuse traces
 *
 * Body: { traces: [ { id, name, userId?, sessionId?, metadata?, observations[] }, ... ] }
 */
router.post(
  `/api/${API_VERSION}/integrations/langfuse/import/batch`,
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { traces } = req.body;

      if (!Array.isArray(traces) || traces.length === 0) {
        return res.status(400).json({ error: 'traces array is required and must not be empty' });
      }

      if (traces.length > 100) {
        return res.status(400).json({ error: 'Maximum 100 traces per batch' });
      }

      const results: Array<Record<string, unknown>> = [];
      const errors: Array<{ index: number; langfuse_trace_id: string; error: string }> = [];

      for (let i = 0; i < traces.length; i++) {
        const trace = traces[i] as LangfuseTrace;
        try {
          const result = await importSingleTrace(trace, req.org.id);
          results.push(result);
        } catch (err: unknown) {
          errors.push({
            index: i,
            langfuse_trace_id: trace.id || 'unknown',
            error: (err as Error).message,
          });
        }
      }

      const totalSpans = results.reduce((sum, r) => sum + ((r.spans_imported as number) || 0), 0);
      const totalTokens = results.reduce((sum, r) => sum + ((r.total_tokens as number) || 0), 0);
      const totalCost = results.reduce((sum, r) => sum + ((r.total_cost_usd as number) || 0), 0);

      console.log(`📦 Langfuse batch import: ${results.length}/${traces.length} traces, ${totalSpans} spans, ${totalTokens} tokens, $${totalCost.toFixed(4)}`);

      res.status(201).json({
        message: `Imported ${results.length} of ${traces.length} traces`,
        imported: results.length,
        failed: errors.length,
        totals: {
          spans: totalSpans,
          tokens: totalTokens,
          cost_usd: parseFloat(totalCost.toFixed(6)),
        },
        results,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err: unknown) {
      console.error('Langfuse batch import error:', (err as Error).message);
      safeError(res, err);
    }
  }
);

export default router;
