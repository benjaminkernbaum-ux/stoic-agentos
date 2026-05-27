/**
 * AI Chat Assistant — The Brain of Stoic AgentOS
 *
 * POST /api/v1/chat
 *   { message, conversation_id?, context_level? }
 *   → { response, conversation_id, model, usage }
 *
 * This endpoint gathers ALL org context (agents, observations, knowledge items,
 * hot cache, stats, workspaces) and builds a deeply-informed system prompt so
 * Claude acts as a full-context expert on the customer's specific setup.
 */

import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase } from '../middleware/db.js';
import { complete, hasAnthropic } from '../lib/anthropic.js';
import type { AuthenticatedRequest } from '../types.js';

const router = Router();
const API_VERSION = 'v1';

// ── In-memory conversation store (swap for DB in production scale) ──
const conversations = new Map<string, Array<{ role: string; content: string }>>();
const CONV_TTL_MS = 30 * 60 * 1000; // 30 min
const MAX_HISTORY = 20; // keep last 20 messages for context

function generateConvId(): string {
  return `conv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Gather full org context ──
async function gatherOrgContext(orgId: string): Promise<string> {
  const sections: string[] = [];

  // 1. Agents
  const { data: agents } = await supabase!
    .from('agents')
    .select('name, description, module, status, total_runs, total_errors, last_heartbeat, created_at')
    .eq('org_id', orgId)
    .order('name');
  
  if (agents?.length) {
    sections.push(`## AGENT FLEET (${agents.length} agents)\n` +
      agents.map(a => 
        `- **${a.name}** [${a.status}] module=${a.module} | runs=${a.total_runs || 0} errors=${a.total_errors || 0}` +
        (a.description ? ` | ${a.description}` : '') +
        (a.last_heartbeat ? ` | last_seen=${new Date(a.last_heartbeat).toISOString()}` : '')
      ).join('\n'));
  } else {
    sections.push('## AGENT FLEET\nNo agents registered yet.');
  }

  // 2. Recent observations (last 50)
  const { data: observations } = await supabase!
    .from('observations')
    .select('type, title, content, importance, created_at, agent_id')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (observations?.length) {
    const typeCounts: Record<string, number> = {};
    observations.forEach(o => { typeCounts[o.type] = (typeCounts[o.type] || 0) + 1; });
    sections.push(
      `## OBSERVATIONS (${observations.length} recent)\n` +
      `Types: ${Object.entries(typeCounts).map(([t, c]) => `${t}(${c})`).join(', ')}\n\n` +
      observations.slice(0, 20).map(o =>
        `- [${o.type}|imp:${o.importance || 5}] **${o.title}**` +
        (o.content ? `\n  ${(o.content as string).slice(0, 200)}` : '')
      ).join('\n')
    );
  } else {
    sections.push('## OBSERVATIONS\nNo observations captured yet.');
  }

  // 3. Knowledge items
  const { data: knowledgeItems } = await supabase!
    .from('knowledge_items')
    .select('name, summary, content, updated_at')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (knowledgeItems?.length) {
    sections.push(
      `## KNOWLEDGE BASE (${knowledgeItems.length} items)\n` +
      knowledgeItems.map(ki =>
        `- **${ki.name}**: ${ki.summary || '(no summary)'}` +
        (ki.content ? `\n  ${(ki.content as string).slice(0, 200)}` : '')
      ).join('\n')
    );
  }

  // 4. Workspaces
  const { data: workspaces } = await supabase!
    .from('workspaces')
    .select('name, path, stack, branch, git_remote')
    .eq('org_id', orgId);

  if (workspaces?.length) {
    sections.push(
      `## WORKSPACES (${workspaces.length})\n` +
      workspaces.map(w => 
        `- **${w.name}** [${w.stack || 'unknown'}] branch=${w.branch || 'main'} path=${w.path || '/'}`
      ).join('\n')
    );
  }

  // 5. Hot cache (pre-computed summary)
  try {
    const { data: org } = await supabase!
      .from('organizations')
      .select('hot_cache, hot_cache_updated_at')
      .eq('id', orgId)
      .single();
    if (org?.hot_cache) {
      sections.push(`## HOT CACHE (AI-generated summary, updated ${org.hot_cache_updated_at})\n${org.hot_cache}`);
    }
  } catch { /* hot_cache column may not exist */ }

  // 6. Recent traces
  try {
    const { data: traces } = await supabase!
      .from('traces')
      .select('trace_id, agent_name, status, duration_ms, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (traces?.length) {
      sections.push(
        `## RECENT TRACES (${traces.length})\n` +
        traces.map(t => 
          `- ${t.agent_name} [${t.status}] duration=${t.duration_ms}ms at ${t.created_at}`
        ).join('\n')
      );
    }
  } catch { /* traces table may not exist */ }

  // 7. Alert rules
  try {
    const { data: rules } = await supabase!
      .from('alert_rules')
      .select('name, condition, channel, enabled')
      .eq('org_id', orgId);
    if (rules?.length) {
      sections.push(
        `## ALERT RULES (${rules.length})\n` +
        rules.map(r => `- ${r.enabled ? '✅' : '❌'} **${r.name}**: ${r.condition} → ${r.channel}`).join('\n')
      );
    }
  } catch { /* alert_rules table may not exist */ }

  return sections.join('\n\n');
}

// ── The System Prompt — This is what makes the AI POWERFUL ──
function buildSystemPrompt(orgContext: string, orgName: string, planName: string): string {
  return `You are **Stoic AI**, the intelligent command center for the Stoic AgentOS platform. You are embedded in the user's dashboard and have FULL access to their organization's data.

## YOUR IDENTITY
- You are the AI brain of Stoic AgentOS — an AI Agent Operations Platform
- You help teams monitor, orchestrate, and scale their AI agent fleets
- You speak with authority, precision, and clarity — like a senior SRE + AI expert
- You are direct and actionable — every response should help the user DO something
- Use markdown formatting for readability (headers, bullets, code blocks, bold)

## ORGANIZATION CONTEXT
Organization: **${orgName}** (${planName} plan)

${orgContext}

## YOUR CAPABILITIES
1. **Onboarding**: Guide new users through setup — SDK installation, first agent, first observation
2. **Agent Analysis**: Analyze agent performance, uptime, error patterns, and provide recommendations
3. **Observation Insights**: Summarize activity, identify trends, flag critical items
4. **Troubleshooting**: Help debug agent issues, API errors, and integration problems
5. **Architecture Advice**: Recommend agent architectures, workflow patterns, monitoring strategies
6. **Knowledge Search**: Search through the org's knowledge base to answer questions
7. **Platform Guidance**: Explain features, plan limits, billing, SDK usage, API endpoints

## SDK QUICK REFERENCE
\`\`\`bash
npm install @stoic/agentos-sdk
\`\`\`
\`\`\`javascript
import { StoicAgent } from '@stoic/agentos-sdk';
const agent = new StoicAgent({
  apiKey: 'sk_live_...',
  name: 'my-agent',
  module: 'my-module'
});
// Auto-capture observations
agent.observe({ type: 'decision', title: 'Chose RAG over fine-tuning', importance: 8 });
// Heartbeat (auto in wrapAgent mode)
agent.heartbeat({ status: 'running' });
\`\`\`

## API ENDPOINTS
- POST /api/v1/agents — Register agent
- POST /api/v1/agents/heartbeat — Agent heartbeat (upsert)
- POST /api/v1/observations — Capture observation
- GET /api/v1/agents — List agents
- GET /api/v1/observations — List observations
- GET /api/v1/traces — List traces
- GET /api/v1/graph — Knowledge graph
- POST /api/v1/insights/ask — Ask AI (this endpoint, but via API)
- POST /api/v1/insights/summarize — Summarize activity

## PLAN LIMITS
| Resource | Free | Pro ($29) | Team ($79) | Enterprise |
|----------|------|-----------|------------|------------|
| Agents | 5 | 25 | 100 | ∞ |
| Observations/mo | 10K | 100K | ∞ | ∞ |
| Workspaces | 2 | 10 | ∞ | ∞ |
| Knowledge Items | 5 | 25 | ∞ | ∞ |

## RULES
- Always ground your answers in the ORGANIZATION CONTEXT above
- When the user asks about their agents, reference actual agent names and statuses
- When giving recommendations, be specific to their actual setup
- If something looks wrong (high error rates, stale heartbeats), proactively mention it
- Keep responses concise but complete — this is a chat, not an essay
- Use code blocks for any commands, API calls, or code snippets
- If the user seems new, guide them step by step
- Never make up data — only reference what's in the context above`;
}

// ── Chat endpoint ──
router.post(`/api/${API_VERSION}/chat`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!hasAnthropic(req.org)) {
      return res.status(402).json({
        error: 'AI chat requires an Anthropic API key',
        hint: 'Set ANTHROPIC_API_KEY on the platform or configure your own key in Settings → AI Configuration',
      });
    }

    const { message, conversation_id, context_level = 'full' } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message required' });
    }

    // Get or create conversation
    const convId = conversation_id || generateConvId();
    let history = conversations.get(convId) || [];

    // Add user message to history
    history.push({ role: 'user', content: message.trim() });

    // Gather org context
    const orgContext = context_level !== 'none' 
      ? await gatherOrgContext(req.org.id)
      : '(Context loading disabled)';

    const orgName = req.org.name || 'My Organization';
    const planName = (req.org.plan || 'free').toUpperCase();

    // Build system prompt with full context
    const systemPrompt = buildSystemPrompt(orgContext, orgName, planName);

    // Keep history manageable
    const messages = history.slice(-MAX_HISTORY).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Call Claude
    const result = await complete(req.org, {
      model: 'smart', // Use Sonnet for the chat — this is the premium feature
      system: systemPrompt,
      messages,
      maxTokens: 4096,
      thinking: true, // Enable extended thinking for complex questions
      endpoint: 'chat',
    });

    // Add assistant response to history
    history.push({ role: 'assistant', content: result.text });

    // Trim and store history
    if (history.length > MAX_HISTORY * 2) {
      history = history.slice(-MAX_HISTORY);
    }
    conversations.set(convId, history);

    // Auto-expire old conversations
    setTimeout(() => {
      if (conversations.has(convId)) {
        conversations.delete(convId);
      }
    }, CONV_TTL_MS);

    res.json({
      response: result.text,
      conversation_id: convId,
      model: result.model,
      usage: result.usage,
      message_count: history.length,
    });

  } catch (err: unknown) {
    const error = err as Error & { code?: string; status?: number; headers?: Record<string, string> };
    if (error.code === 'NO_ANTHROPIC_KEY') {
      return res.status(402).json({
        error: 'Anthropic API key not configured',
        hint: 'Go to Settings → AI Configuration to add your Anthropic API key',
      });
    }
    if (error.status === 401) return res.status(402).json({ error: 'Invalid Anthropic API key' });
    if (error.status === 429) return res.status(429).json({ error: 'Rate limit — try again shortly', retry_after: error.headers?.['retry-after'] });
    console.error('[chat] error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Get conversation history ──
router.get(`/api/${API_VERSION}/chat/:conversationId`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const history = conversations.get(req.params.conversationId);
  if (!history) return res.status(404).json({ error: 'Conversation not found or expired' });
  res.json({ conversation_id: req.params.conversationId, messages: history, count: history.length });
});

// ── Suggested prompts for empty state ──
router.get(`/api/${API_VERSION}/chat/suggestions`, authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    suggestions: [
      { icon: '🚀', text: 'How do I get started with AgentOS?', category: 'onboarding' },
      { icon: '🤖', text: 'Analyze my agent fleet performance', category: 'analysis' },
      { icon: '📊', text: 'Summarize recent activity', category: 'insights' },
      { icon: '⚡', text: 'How do I set up real-time monitoring?', category: 'guidance' },
      { icon: '🔧', text: 'Help me debug my agent integration', category: 'troubleshooting' },
      { icon: '📈', text: 'What should I optimize next?', category: 'recommendations' },
    ],
  });
});

export default router;
