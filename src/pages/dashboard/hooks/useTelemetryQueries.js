import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, API_BASE } from '../../../lib/supabase';

async function getHeaders() {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

export function useAgentsQuery(orgId) {
  return useQuery({
    queryKey: ['agents', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/agents?org_id=${orgId}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch agents');
      return res.json();
    },
    enabled: !!orgId,
  });
}

export function useWorkspacesQuery(orgId) {
  return useQuery({
    queryKey: ['workspaces', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/workspaces?org_id=${orgId}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch workspaces');
      return res.json();
    },
    enabled: !!orgId,
  });
}

export function useObservationsQuery(orgId) {
  return useQuery({
    queryKey: ['observations', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/observations?org_id=${orgId}&limit=50`, { headers });
      if (!res.ok) throw new Error('Failed to fetch observations');
      return res.json();
    },
    enabled: !!orgId,
  });
}

export function useTracesQuery(orgId) {
  return useQuery({
    queryKey: ['traces', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/traces?org_id=${orgId}&limit=50`, { headers });
      if (!res.ok) throw new Error('Failed to fetch traces');
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || []);
    },
    enabled: !!orgId,
  });
}

export function useTraceStatsQuery(orgId) {
  return useQuery({
    queryKey: ['traceStats', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/traces/stats?org_id=${orgId}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch trace stats');
      const data = await res.json();
      return data?.stats || data || null;
    },
    enabled: !!orgId,
  });
}

export function useStatsQuery(orgId) {
  return useQuery({
    queryKey: ['stats', orgId],
    queryFn: async () => {
      if (!orgId) return { agents: 0, workspaces: 0, observations: 0, knowledgeItems: 0 };
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/stats?org_id=${orgId}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: !!orgId,
  });
}

export function useApiKeysQuery(orgId) {
  return useQuery({
    queryKey: ['apiKeys', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/api-keys?org_id=${orgId}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch API keys');
      return res.json();
    },
    enabled: !!orgId,
  });
}

export function useKnowledgeItemsQuery(orgId) {
  return useQuery({
    queryKey: ['knowledgeItems', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/knowledge-items?org_id=${orgId}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch knowledge items');
      return res.json();
    },
    enabled: !!orgId,
  });
}

export function useRegisterAgentMutation(orgId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (agentForm) => {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/agents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...agentForm, org_id: orgId, status: 'idle' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to register agent');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', orgId] });
      queryClient.invalidateQueries({ queryKey: ['stats', orgId] });
    },
  });
}

export function useAddWorkspaceMutation(orgId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (wsForm) => {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/workspaces`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...wsForm, org_id: orgId, status: 'active' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to add workspace');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', orgId] });
      queryClient.invalidateQueries({ queryKey: ['stats', orgId] });
    },
  });
}

export function useDeleteObsMutation(orgId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (obsId) => {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/observations/${obsId}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed to delete observation');
      return obsId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations', orgId] });
      queryClient.invalidateQueries({ queryKey: ['stats', orgId] });
    },
  });
}

export function useToggleAgentStatusMutation(orgId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ agentId, nextStatus }) => {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/agents/${agentId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', orgId] });
    },
  });
}

export function useRunAgentMutation(orgId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ agentId, task, workspaceId }) => {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/agents/${agentId}/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ task, workspace_id: workspaceId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Agent execution failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', orgId] });
      queryClient.invalidateQueries({ queryKey: ['traces', orgId] });
      queryClient.invalidateQueries({ queryKey: ['traceStats', orgId] });
    },
  });
}

export function useCreateKIMutation(orgId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (kiForm) => {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/knowledge-items`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...kiForm, org_id: orgId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create knowledge item');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeItems', orgId] });
      queryClient.invalidateQueries({ queryKey: ['stats', orgId] });
    },
  });
}

export function useCaptureMutation(orgId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (captureForm) => {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/observations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...captureForm, org_id: orgId }),
      });
      if (!res.ok) throw new Error('Failed to capture observation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations', orgId] });
      queryClient.invalidateQueries({ queryKey: ['stats', orgId] });
    },
  });
}

export function useGenerateKeyMutation(orgId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/api-keys`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: `Key ${new Date().toLocaleDateString()}` }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to generate key');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys', orgId] });
    },
  });
}

export function useRevokeKeyMutation(orgId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (keyId) => {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/v1/api-keys/${keyId}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed to revoke key');
      return keyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys', orgId] });
    },
  });
}

export function useSeedDemoMutation(orgId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const headers = await getHeaders();
      
      const wsListRes = await fetch(`${API_BASE}/api/v1/workspaces`, { headers });
      const existingWorkspaces = wsListRes.ok ? await wsListRes.json() : [];
      
      const agentsListRes = await fetch(`${API_BASE}/api/v1/agents`, { headers });
      const existingAgents = agentsListRes.ok ? await agentsListRes.json() : [];

      const workspacesToSeed = [
        { name: 'stoic-agentos', path: 'c:/Users/benja/OneDrive/Documentos/Stoic AgentOS', stack: 'React 19, Express, PostgreSQL', git_remote: 'github.com/benjaminkernbaum-ux/stoic-agentos', branch: 'main' },
        { name: 'stoicbot-core', path: 'c:/Users/benja/OneDrive/Documentos/StoicBot', stack: 'Node.js, Telegram Bot API', git_remote: 'github.com/benjaminkernbaum-ux/stoicbot', branch: 'master' }
      ];

      const workspaceMap = {};
      for (const ws of workspacesToSeed) {
        const found = existingWorkspaces.find(w => w.name === ws.name);
        if (found) {
          workspaceMap[ws.name] = found.id;
        } else {
          const res = await fetch(`${API_BASE}/api/v1/workspaces`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...ws, org_id: orgId })
          });
          if (res.ok) {
            const data = await res.json();
            workspaceMap[ws.name] = data.id;
          }
        }
      }

      const agentsToSeed = [
        { name: 'FINCFO', module: 'finance', description: 'Daily CFO briefings — Stripe + ChartMogul data compilation (07:00 daily)', status: 'running' },
        { name: 'DUNNING', module: 'finance', description: 'Failed payment recovery — Stripe webhook handler & customer outreach', status: 'running' },
        { name: 'STOICBOT', module: 'content', description: '24/7 Telegram content pipeline — 10 scheduled posts/day', status: 'running' },
        { name: 'INFRA-AGENT-1', module: 'standalone', description: 'Infrastructure operations specialist — GitHub + Railway + Supabase deploy logs', status: 'idle' },
        { name: 'LW-EA', module: 'standalone', description: 'MetaTrader 5 Expert Advisor — MQL5 auto-trading on NAS100 index', status: 'running' },
        { name: 'DIALER', module: 'crm', description: 'Cold outreach scheduler — Outlook SMTP rotation', status: 'paused' }
      ];

      const agentMap = {};
      for (const a of agentsToSeed) {
        const found = existingAgents.find(x => x.name === a.name);
        if (found) {
          agentMap[a.name] = found.id;
        } else {
          const res = await fetch(`${API_BASE}/api/v1/agents`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...a, org_id: orgId })
          });
          if (res.ok) {
            const data = await res.json();
            agentMap[a.name] = data.id;
          }
        }
      }

      const firstWsId = Object.values(workspaceMap)[0] || null;
      const firstAgentId = Object.values(agentMap)[0] || null;

      const observationsToSeed = [
        {
          type: 'deployment',
          title: 'Deployed v1.4.2 to production via Railway',
          content: 'Zero-downtime deployment finished in 4m 12s. Railway service: stoic-agentos-api. All health probes (liveness, readiness) returned 200 OK.',
          workspace: workspaceMap['stoic-agentos'] || firstWsId,
          agent: agentMap['INFRA-AGENT-1'] || firstAgentId
        },
        {
          type: 'decision',
          title: 'Switched default LLM to GPT-4o-mini',
          content: 'Switched default LLM for nightly bookkeeper ledger summaries to gpt-4o-mini. Observed 88% reduction in token cost with equivalent classification accuracy on Stripe invoice records.',
          workspace: workspaceMap['stoic-agentos'] || firstWsId,
          agent: agentMap['FINCFO'] || firstAgentId
        },
        {
          type: 'error',
          title: 'Detected failed payment webhook from Stripe',
          content: 'Stripe invoice.payment_failed received for customer cus_Qp8v923k. Charge attempt failed due to insufficient funds. Triggering dunning sequence 1 (delay 24h).',
          workspace: workspaceMap['stoicbot-core'] || firstWsId,
          agent: agentMap['DUNNING'] || firstAgentId
        },
        {
          type: 'discovery',
          title: 'Identified 4 unmapped Stripe invoice charges',
          content: 'Found four historical saas-hub charges that were missing standard metadata. Reconciled and updated google sheet ledgers dynamically.',
          workspace: workspaceMap['stoicbot-core'] || firstWsId,
          agent: agentMap['FINCFO'] || firstAgentId
        },
        {
          type: 'architecture',
          title: 'Migrated to event-driven webhook pipeline',
          content: 'Replaced high-frequency polling on Telegram updates with long-polling via active webhooks. Dashboard latency dropped from 2.4s to 180ms.',
          workspace: workspaceMap['stoic-agentos'] || firstWsId,
          agent: agentMap['STOICBOT'] || firstAgentId
        }
      ];

      for (const obs of observationsToSeed) {
        await fetch(`${API_BASE}/api/v1/observations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...obs, org_id: orgId })
        });
      }

      const timestamp = Date.now();
      const tracesToSeed = [
        {
          trace: {
            trace_id: `tr_fincfo_report_${timestamp}`,
            name: 'fincfo-morning-report',
            agent: 'FINCFO',
            status: 'success',
            duration_ms: 2450,
            metadata: { reason: 'daily financial brief', stripe_invoices_checked: 24 }
          },
          spans: [
            {
              provider: 'anthropic',
              model: 'claude-3-5-sonnet',
              type: 'chat.completions',
              prompt_tokens: 4200,
              completion_tokens: 750,
              latency_ms: 1850,
              status: 'success',
              metadata: { temperature: 0.2 }
            },
            {
              provider: 'anthropic',
              model: 'claude-3-haiku',
              type: 'chat.completions',
              prompt_tokens: 1200,
              completion_tokens: 350,
              latency_ms: 600,
              status: 'success'
            }
          ]
        },
        {
          trace: {
            trace_id: `tr_dunning_rec_${timestamp}`,
            name: 'dunning-webhook-recovery',
            agent: 'DUNNING',
            status: 'success',
            duration_ms: 1520,
            metadata: { customer_id: 'cus_R98k1' }
          },
          spans: [
            {
              provider: 'openai',
              model: 'gpt-4o-mini',
              type: 'chat.completions',
              prompt_tokens: 1500,
              completion_tokens: 280,
              latency_ms: 750,
              status: 'success'
            },
            {
              provider: 'openai',
              model: 'gpt-4o-mini',
              type: 'chat.completions',
              prompt_tokens: 1200,
              completion_tokens: 150,
              latency_ms: 770,
              status: 'success'
            }
          ]
        },
        {
          trace: {
            trace_id: `tr_stoicbot_err_${timestamp}`,
            name: 'stoicbot-daily-schedule',
            agent: 'STOICBOT',
            status: 'error',
            duration_ms: 1100,
            metadata: { posts_remaining: 4 }
          },
          spans: [
            {
              provider: 'openai',
              model: 'gpt-4o',
              type: 'chat.completions',
              prompt_tokens: 3500,
              completion_tokens: 0,
              latency_ms: 1100,
              status: 'error',
              error_message: 'Rate limit exceeded (429) on gpt-4o',
              metadata: { retries: 0 }
            }
          ]
        }
      ];

      for (const t of tracesToSeed) {
        await fetch(`${API_BASE}/api/v1/traces/ingest`, {
          method: 'POST',
          headers,
          body: JSON.stringify(t)
        });
      }

      const workingMemToSeed = [
        { agent_id: agentMap['FINCFO'] || null, session_id: 'sess_fincfo_daily', key: 'current_stage', value: 'fetching_stripe_ledger', ttl_seconds: 86400 },
        { agent_id: agentMap['DUNNING'] || null, session_id: 'sess_dunning_web', key: 'active_recovery_attempts', value: { cus_P92: 1, cus_Q12: 2 }, ttl_seconds: 86400 },
        { agent_id: agentMap['STOICBOT'] || null, session_id: 'sess_stoicbot_tele', key: 'telegram_rate_limits', value: { allowed_per_min: 20, remaining: 18 }, ttl_seconds: 86400 }
      ];

      for (const wm of workingMemToSeed) {
        await fetch(`${API_BASE}/api/v1/memory/working`, {
          method: 'POST',
          headers,
          body: JSON.stringify(wm)
        });
      }

      const episodicMemToSeed = [
        { agent_id: agentMap['FINCFO'] || null, content: 'Identified a discrepancies of $432.00 between Stripe reports and Ledger payouts. Discrepancy auto-logged to reconciliation sheets.', event_type: 'discovery', importance: 7 },
        { agent_id: agentMap['DUNNING'] || null, content: 'Stripe dunning completed for customer cus_Qp8v923k. Subscription successfully reactivated after second payment retry.', event_type: 'decision', importance: 8 },
        { agent_id: agentMap['LW-EA'] || null, content: 'LW-EA MetaTrader terminal connection disconnected. Performed automated recovery protocol to re-establish sockets.', event_type: 'error', importance: 9 }
      ];

      for (const em of episodicMemToSeed) {
        await fetch(`${API_BASE}/api/v1/memory/episodic`, {
          method: 'POST',
          headers,
          body: JSON.stringify(em)
        });
      }

      const semanticMemToSeed = [
        { subject: 'FINCFO', relation: 'queries', object: 'Stripe API', confidence: 1.0, source_type: 'extraction' },
        { subject: 'DUNNING', relation: 'notifies', object: 'Customer Support', confidence: 0.95, source_type: 'extraction' },
        { subject: 'STOICBOT', relation: 'publishes_to', object: 'Telegram Channels', confidence: 1.0, source_type: 'extraction' },
        { subject: 'INFRA-AGENT-1', relation: 'deploys_to', object: 'Railway', confidence: 1.0, source_type: 'extraction' },
        { subject: 'LW-EA', relation: 'trades_instrument', object: 'NAS100 Index', confidence: 1.0, source_type: 'extraction' }
      ];

      for (const sm of semanticMemToSeed) {
        await fetch(`${API_BASE}/api/v1/memory/semantic`, {
          method: 'POST',
          headers,
          body: JSON.stringify(sm)
        });
      }

      const complianceToSeed = [
        {
          agent_id: agentMap['FINCFO'] || null,
          event_type: 'api_call',
          action: 'Fetch Stripe ledger data',
          verdict: 'PROCEED',
          reasoning: 'Requested endpoints are read-only. Access key satisfies read permission criteria.',
          policy_version: '1.0'
        },
        {
          agent_id: agentMap['INFRA-AGENT-1'] || null,
          event_type: 'write_file',
          action: 'Write package.json',
          verdict: 'PROCEED',
          reasoning: 'File modifications match verified delta patterns and pass code-quality check rules.',
          policy_version: '1.2'
        },
        {
          agent_id: agentMap['DUNNING'] || null,
          event_type: 'payout_approval',
          action: 'Initiate manual customer refund of $1,500',
          verdict: 'BLOCK',
          reasoning: 'Agent attempted to approve a refund exceeding the maximum autonomous limit ($500.00). Requires secondary owner multi-sig authorization.',
          policy_version: '2.0'
        },
        {
          agent_id: agentMap['DIALER'] || null,
          event_type: 'email_outreach',
          action: 'Send bulk email outreach to 340 recipients',
          verdict: 'BLOCK',
          reasoning: 'Spam prevention filter triggered: Dialer has sent 90 emails in the past hour. Sending more would exceed the hourly domain rate limit.',
          policy_version: '2.1'
        }
      ];

      for (const comp of complianceToSeed) {
        await fetch(`${API_BASE}/api/v1/compliance/audit-log`, {
          method: 'POST',
          headers,
          body: JSON.stringify(comp)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', orgId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', orgId] });
      queryClient.invalidateQueries({ queryKey: ['observations', orgId] });
      queryClient.invalidateQueries({ queryKey: ['traces', orgId] });
      queryClient.invalidateQueries({ queryKey: ['traceStats', orgId] });
      queryClient.invalidateQueries({ queryKey: ['stats', orgId] });
      queryClient.invalidateQueries({ queryKey: ['knowledgeItems', orgId] });
    }
  });
}
