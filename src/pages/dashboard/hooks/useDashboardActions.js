import { supabase, API_BASE } from '../../../lib/supabase';

// Helper to get auth token
async function getToken() {
  return (await supabase.auth.getSession()).data.session?.access_token;
}

export function useDashboardActions({ org, toast, fetchData, setAgents, setObservations, setStats, setUsage, setApiKeys, setKnowledgeItems, setWorkspaces }) {

  const handleCapture = async (e, captureForm, setCaptureForm, setCaptureLoading, onCaptureRef) => {
    e.preventDefault();
    if (!captureForm.title.trim()) return;
    setCaptureLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/observations`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...captureForm, org_id: org.id }),
      });
      if (res.ok) {
        const newObs = await res.json();
        setObservations(prev => [newObs, ...prev]);
        setStats(prev => ({ ...prev, observations: (prev.observations || 0) + 1 }));
        setUsage(prev => ({ ...prev, count: prev.count + 1 }));
        setCaptureForm({ type: 'note', title: '', content: '' });
        onCaptureRef.current?.();
      }
    } catch (err) {
      console.error('Capture failed:', err);
      toast('Failed to capture observation. Try again.', 'error');
    }
    setCaptureLoading(false);
  };

  const handleUpgrade = async (plan, setUpgradeLoading) => {
    setUpgradeLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/billing/checkout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      } else {
        const body = await res.json().catch(() => ({}));
        toast(body.error || 'Failed to start checkout', 'error');
      }
    } catch {
      toast('Checkout unavailable. Please try again later.', 'error');
    }
    setUpgradeLoading(false);
  };

  const handleManageSubscription = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/billing/portal`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      } else {
        const body = await res.json().catch(() => ({}));
        toast(body.error || 'Failed to open billing portal', 'error');
      }
    } catch {
      toast('Billing portal unavailable. Please try again later.', 'error');
    }
  };

  const handleGenerateKey = async (setKeyGenLoading, setApiKey) => {
    setKeyGenLoading(true);
    try {
      const token = await getToken();
      if (!token) { toast('Session expired — please sign in again', 'error'); return; }
      const res = await fetch(`${API_BASE}/api/v1/api-keys`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Key ${new Date().toLocaleDateString()}` }),
      });
      if (res.ok) {
        const newKey = await res.json();
        setApiKey(newKey.key);
        toast("API key generated — copy it now, it won't be shown again", 'success');
        const listRes = await fetch(`${API_BASE}/api/v1/api-keys?org_id=${org.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (listRes.ok) setApiKeys(await listRes.json());
      } else {
        const body = await res.json().catch(() => ({}));
        toast(body.error || 'Failed to generate key', 'error');
      }
    } catch {
      toast('Failed to generate key — check your connection', 'error');
    } finally {
      setKeyGenLoading(false);
    }
  };

  const handleRevokeKey = async (k) => {
    if (!window.confirm('Revoke this API key? Agents using it will stop working.')) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/api-keys/${k.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setApiKeys(prev => prev.map(key => key.id === k.id ? { ...key, active: false } : key));
        toast('API key revoked', 'info');
      } else {
        toast('Failed to revoke key', 'error');
      }
    } catch {
      toast('Failed to revoke key — check your connection', 'error');
    }
  };

  const handleSeedDemo = async (setSeedLoading) => {
    setSeedLoading(true);
    try {
      const token = await getToken();
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      // 1. Get existing workspaces and agents to prevent duplicates and link relations correctly
      const wsListRes = await fetch(`${API_BASE}/api/v1/workspaces`, { headers });
      const existingWorkspaces = wsListRes.ok ? await wsListRes.json() : [];
      
      const agentsListRes = await fetch(`${API_BASE}/api/v1/agents`, { headers });
      const existingAgents = agentsListRes.ok ? await agentsListRes.json() : [];

      // 2. Create or find workspaces
      const workspacesToSeed = [
        { name: 'stoic-agentos', path: 'c:/Users/benja/OneDrive/Documentos/Stoic AgentOS', stack: 'React 19, Express, PostgreSQL', git_remote: 'github.com/benjaminkernbaum-ux/stoic-agentos', branch: 'main' },
        { name: 'stoicbot-core', path: 'c:/Users/benja/OneDrive/Documentos/StoicBot', stack: 'Node.js, Telegram Bot API', git_remote: 'github.com/benjaminkernbaum-ux/stoicbot', branch: 'master' }
      ];

      const workspaceMap = {}; // name -> id
      for (const ws of workspacesToSeed) {
        const found = existingWorkspaces.find(w => w.name === ws.name);
        if (found) {
          workspaceMap[ws.name] = found.id;
        } else {
          const res = await fetch(`${API_BASE}/api/v1/workspaces`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...ws, org_id: org.id })
          });
          if (res.ok) {
            const data = await res.json();
            workspaceMap[ws.name] = data.id;
          }
        }
      }

      // 3. Create or find agents
      const agentsToSeed = [
        { name: 'FINCFO', module: 'finance', description: 'Daily CFO briefings — Stripe + ChartMogul data compilation (07:00 daily)', status: 'running' },
        { name: 'DUNNING', module: 'finance', description: 'Failed payment recovery — Stripe webhook handler & customer outreach', status: 'running' },
        { name: 'STOICBOT', module: 'content', description: '24/7 Telegram content pipeline — 10 scheduled posts/day', status: 'running' },
        { name: 'INFRA-AGENT-1', module: 'standalone', description: 'Infrastructure operations specialist — GitHub + Railway + Supabase deploy logs', status: 'idle' },
        { name: 'LW-EA', module: 'standalone', description: 'MetaTrader 5 Expert Advisor — MQL5 auto-trading on NAS100 index', status: 'running' },
        { name: 'DIALER', module: 'crm', description: 'Cold outreach scheduler — Outlook SMTP rotation', status: 'paused' }
      ];

      const agentMap = {}; // name -> id
      for (const a of agentsToSeed) {
        const found = existingAgents.find(x => x.name === a.name);
        if (found) {
          agentMap[a.name] = found.id;
        } else {
          const res = await fetch(`${API_BASE}/api/v1/agents`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...a, org_id: org.id })
          });
          if (res.ok) {
            const data = await res.json();
            agentMap[a.name] = data.id;
          }
        }
      }

      // Fallbacks if workspace/agent creation failed
      const firstWsId = Object.values(workspaceMap)[0] || null;
      const firstAgentId = Object.values(agentMap)[0] || null;

      // 4. Create observations linked to workspaces and agents
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
          body: JSON.stringify({ ...obs, org_id: org.id })
        });
      }

      // 5. Ingest Traces and Spans
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

      // 6. Seed Three-Tier Memory
      // Working Memory
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

      // Episodic Memory
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

      // Semantic Memory
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

      // 7. Seed Compliance (Audit Logs)
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

      toast('Demo data loaded successfully! Explore Traces, Memory, Compliance, and the network Graph.', 'success');
      await fetchData();
    } catch (err) {
      console.error('Seed failed:', err);
      toast('Failed to seed demo data', 'error');
    }
    setSeedLoading(false);
  };

  const handleRegisterAgent = async (e, agentForm, setAgentForm, setShowAgentModal) => {
    e.preventDefault();
    if (!agentForm.name.trim()) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/agents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...agentForm, org_id: org.id, status: 'idle' }),
      });
      if (res.ok) {
        const newAgent = await res.json();
        setAgents(prev => [newAgent, ...prev]);
        setAgentForm({ name: '', module: '', description: '' });
        setShowAgentModal(false);
        toast('Agent registered!', 'success');
      } else {
        const body = await res.json().catch(() => ({}));
        toast(body.error || 'Failed to register agent', 'error');
      }
    } catch { toast('Failed to register agent', 'error'); }
  };

  const handleAddWorkspace = async (e, wsForm, setWsForm, setShowWsModal) => {
    e.preventDefault();
    if (!wsForm.name.trim()) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/workspaces`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...wsForm, org_id: org.id, status: 'active' }),
      });
      if (res.ok) {
        const newWs = await res.json();
        setWorkspaces(prev => [newWs, ...prev]);
        setWsForm({ name: '', branch: 'main', stack: '' });
        setShowWsModal(false);
        toast('Workspace added!', 'success');
      } else {
        const body = await res.json().catch(() => ({}));
        toast(body.error || 'Failed to add workspace', 'error');
      }
    } catch { toast('Failed to add workspace', 'error'); }
  };

  const handleDeleteObs = async (obsId) => {
    if (!window.confirm('Delete this observation?')) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/observations/${obsId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setObservations(prev => prev.filter(o => o.id !== obsId));
        setStats(prev => ({ ...prev, observations: Math.max(0, (prev.observations || 1) - 1) }));
        toast('Observation deleted', 'info');
      }
    } catch { toast('Failed to delete', 'error'); }
  };

  const toggleAgentStatus = async (agentId, currentStatus, setSelectedAgent) => {
    const AGENT_STATUSES = ['running', 'idle', 'paused', 'disabled'];
    const currentIdx = AGENT_STATUSES.indexOf(currentStatus || 'idle');
    const nextStatus = AGENT_STATUSES[(currentIdx + 1) % AGENT_STATUSES.length];
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAgents(prev => prev.map(a => a.id === agentId ? updated : a));
        setSelectedAgent(prev => prev?.id === agentId ? updated : prev);
        toast(`Agent → ${nextStatus}`, 'success');
      }
    } catch { toast('Failed to update status', 'error'); }
  };

  const handleCreateKI = async (e, kiForm, setKiForm, setShowKiModal) => {
    e.preventDefault();
    if (!kiForm.name.trim()) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/knowledge-items`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...kiForm, org_id: org.id }),
      });
      if (res.ok) {
        const newKI = await res.json();
        setKnowledgeItems(prev => [newKI, ...prev]);
        setKiForm({ name: '', summary: '', content: '' });
        setShowKiModal(false);
        toast('Knowledge item created!', 'success');
      } else {
        const body = await res.json().catch(() => ({}));
        toast(body.error || 'Failed to create knowledge item', 'error');
      }
    } catch { toast('Failed to create knowledge item', 'error'); }
  };

  return {
    handleCapture,
    handleUpgrade,
    handleManageSubscription,
    handleGenerateKey,
    handleRevokeKey,
    handleSeedDemo,
    handleRegisterAgent,
    handleAddWorkspace,
    handleDeleteObs,
    toggleAgentStatus,
    handleCreateKI,
  };
}
