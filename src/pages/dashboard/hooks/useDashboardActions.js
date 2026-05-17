import { supabase, API_BASE } from '../../../lib/supabase';

// Helper to get auth token
async function getToken() {
  return (await supabase.auth.getSession()).data.session?.access_token;
}

export function useDashboardActions({ org, toast, fetchData, setAgents, setObservations, setStats, setUsage, setApiKeys, setKnowledgeItems }) {

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
      const demoAgents = [
        { name: 'content-writer', module: 'content', description: 'Generates blog posts and social copy', status: 'running' },
        { name: 'code-reviewer', module: 'engineering', description: 'Reviews PRs and suggests improvements', status: 'idle' },
        { name: 'data-pipeline', module: 'analytics', description: 'ETL pipeline for daily metrics', status: 'running' },
      ];
      const demoObs = [
        { type: 'deployment', title: 'Deployed v1.3 to production', content: 'Zero-downtime deployment via Railway. All health checks passed.' },
        { type: 'decision', title: 'Switched content-writer from GPT-4 to Claude 3.5', content: 'Claude produces 40% fewer hallucinations on our domain-specific content.' },
        { type: 'architecture', title: 'Migrated to event-driven pipeline', content: 'Replaced polling with webhooks. Latency dropped from 2.4s to 180ms.' },
        { type: 'error', title: 'Rate limit hit on OpenAI API', content: 'Exceeded 10K RPM on the summarization endpoint. Added exponential backoff.' },
        { type: 'discovery', title: 'Found N+1 query in workspace sync', content: 'Each workspace was making individual DB calls. Batched into single query — 8x speedup.' },
      ];
      for (const a of demoAgents) {
        await fetch(`${API_BASE}/api/v1/agents`, { method: 'POST', headers, body: JSON.stringify({ ...a, org_id: org.id }) });
      }
      for (const o of demoObs) {
        await fetch(`${API_BASE}/api/v1/observations`, { method: 'POST', headers, body: JSON.stringify({ ...o, org_id: org.id }) });
      }
      toast('Demo data seeded! Explore your dashboard.', 'success');
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
