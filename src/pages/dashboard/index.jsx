import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import OnboardingTour from '../../components/OnboardingTour';
import ErrorBoundary from '../../components/ErrorBoundary';
import { useToast, ToastContainer } from './hooks/useToast.jsx';
import { CAPTURE_HINTS } from './constants';
import { useUIStore } from './store/useUIStore';
import { supabase, API_BASE } from '../../lib/supabase';
import {
  useAgentsQuery,
  useWorkspacesQuery,
  useObservationsQuery,
  useTracesQuery,
  useTraceStatsQuery,
  useStatsQuery,
  useApiKeysQuery,
  useKnowledgeItemsQuery,
  useRegisterAgentMutation,
  useAddWorkspaceMutation,
  useDeleteObsMutation,
  useToggleAgentStatusMutation,
  useRunAgentMutation,
  useCreateKIMutation,
  useCaptureMutation,
  useGenerateKeyMutation,
  useRevokeKeyMutation,
  useSeedDemoMutation
} from './hooks/useTelemetryQueries';

// Components
import CommandPalette from './components/CommandPalette';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { AgentModal, WorkspaceModal, AgentDetailModal, KnowledgeItemModal } from './components/Modals';

// Tabs (Dynamic code-splitting)
const OverviewTab = lazy(() => import('./tabs/OverviewTab'));
const AgentsTab = lazy(() => import('./tabs/AgentsTab'));
const WorkspacesTab = lazy(() => import('./tabs/WorkspacesTab'));
const BrainTab = lazy(() => import('./tabs/BrainTab'));
const GraphTab = lazy(() => import('./tabs/GraphTab'));
const TracesTab = lazy(() => import('./tabs/TracesTab'));
const CommandCenterTab = lazy(() => import('./tabs/CommandCenterTab'));
const WorkflowsTab = lazy(() => import('./tabs/WorkflowsTab'));
const MemoryTab = lazy(() => import('./tabs/MemoryTab'));
const ComplianceTab = lazy(() => import('./tabs/ComplianceTab'));
const ChatTab = lazy(() => import('./tabs/ChatTab'));
const InboxTab = lazy(() => import('./tabs/InboxTab'));
const IntegrationsTab = lazy(() => import('./tabs/IntegrationsTab'));
const TemplatesTab = lazy(() => import('./tabs/TemplatesTab'));
const SkillsTab = lazy(() => import('./tabs/SkillsTab'));
const TeamHQTab = lazy(() => import('./tabs/TeamHQTab'));
const SettingsTab = lazy(() => import('./tabs/SettingsTab'));
import WelcomeModal from './components/WelcomeModal';

import '../Dashboard.css';

function TabSkeleton() {
  return (
    <div className="tab-skeleton" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: '200px', height: '32px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', animation: 'pulse-dot 1.5s infinite' }} />
        <div style={{ width: '120px', height: '36px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', animation: 'pulse-dot 1.5s infinite' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div style={{ height: '120px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', animation: 'pulse-dot 1.5s infinite' }} />
        <div style={{ height: '120px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', animation: 'pulse-dot 1.5s infinite' }} />
        <div style={{ height: '120px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', animation: 'pulse-dot 1.5s infinite' }} />
      </div>
      <div style={{ flex: 1, minHeight: '300px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', animation: 'pulse-dot 1.5s infinite' }} />
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, org, signOut, loading: authLoading } = useAuth();
  const { toasts, show: toast } = useToast();

  // Zustand Store selectors
  const activeTab = useUIStore(s => s.activeTab);
  const setActiveTab = useUIStore(s => s.setActiveTab);
  const sidebarOpen = useUIStore(s => s.sidebarOpen);
  const setSidebarOpen = useUIStore(s => s.setSidebarOpen);
  const mobileSidebarOpen = useUIStore(s => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useUIStore(s => s.setMobileSidebarOpen);
  const cmdOpen = useUIStore(s => s.cmdOpen);
  const setCmdOpen = useUIStore(s => s.setCmdOpen);
  const cmdQuery = useUIStore(s => s.cmdQuery);
  const setCmdQuery = useUIStore(s => s.setCmdQuery);
  const showWelcome = useUIStore(s => s.showWelcome);
  const setShowWelcome = useUIStore(s => s.setShowWelcome);
  const showAgentModal = useUIStore(s => s.showAgentModal);
  const setShowAgentModal = useUIStore(s => s.setShowAgentModal);
  const showWsModal = useUIStore(s => s.showWsModal);
  const setShowWsModal = useUIStore(s => s.setShowWsModal);
  const showKiModal = useUIStore(s => s.showKiModal);
  const setShowKiModal = useUIStore(s => s.setShowKiModal);
  const selectedAgent = useUIStore(s => s.selectedAgent);
  const setSelectedAgent = useUIStore(s => s.setSelectedAgent);

  // Local component UI state
  const [brainFilter, setBrainFilter] = useState('all');
  const [captureForm, setCaptureForm] = useState({ type: 'note', title: '', content: '' });
  const [captureLoading, setCaptureLoading] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [keyGenLoading, setKeyGenLoading] = useState(false);
  const [agentForm, setAgentForm] = useState({ name: '', module: '', description: '' });
  const [wsForm, setWsForm] = useState({ name: '', branch: 'main', stack: '' });
  const [kiForm, setKiForm] = useState({ name: '', summary: '', content: '' });
  const [expandedObs, setExpandedObs] = useState(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [obsSearch, setObsSearch] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  const onCaptureRef = useRef(null);
  const cmdInputRef = useRef(null);

  // React Query Fetch Hooks
  const { data: agents = [], isLoading: agentsLoading } = useAgentsQuery(org?.id);
  const { data: workspaces = [], isLoading: workspacesLoading } = useWorkspacesQuery(org?.id);
  const { data: observations = [], isLoading: observationsLoading } = useObservationsQuery(org?.id);
  const { data: stats = { agents: 0, workspaces: 0, observations: 0, knowledgeItems: 0 } } = useStatsQuery(org?.id);
  const { data: apiKeys = [] } = useApiKeysQuery(org?.id);
  const { data: knowledgeItems = [] } = useKnowledgeItemsQuery(org?.id);
  const { data: traces = [] } = useTracesQuery(org?.id);
  const { data: traceStats = null } = useTraceStatsQuery(org?.id);

  // React Query Mutation Hooks
  const registerAgentMutation = useRegisterAgentMutation(org?.id);
  const addWorkspaceMutation = useAddWorkspaceMutation(org?.id);
  const deleteObsMutation = useDeleteObsMutation(org?.id);
  const toggleAgentStatusMutation = useToggleAgentStatusMutation(org?.id);
  const runAgentMutation = useRunAgentMutation(org?.id);
  const createKIMutation = useCreateKIMutation(org?.id);
  const captureMutation = useCaptureMutation(org?.id);
  const generateKeyMutation = useGenerateKeyMutation(org?.id);
  const revokeKeyMutation = useRevokeKeyMutation(org?.id);
  const seedDemoMutation = useSeedDemoMutation(org?.id);

  // Derived values
  const liveAgents = useMemo(() => agents.filter(a => a.status === 'running').length, [agents]);
  const errorAgents = useMemo(() => agents.filter(a => a.status === 'error').length, [agents]);
  const usageLimit = stats.observationLimit || 10000;
  const usageCount = stats.observations || 0;
  const usagePct = useMemo(() => usageLimit > 0 ? ((usageCount / usageLimit) * 100).toFixed(1) : 0, [usageCount, usageLimit]);
  const dataLoading = agentsLoading || workspacesLoading || observationsLoading;
  const isNewUser = false;

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileSidebarOpen]);

  // Rotate capture placeholder
  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % CAPTURE_HINTS.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Cmd+K palette key listener
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(!cmdOpen);
        setCmdQuery('');
      }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cmdOpen, setCmdOpen, setCmdQuery]);

  // Focus cmd input when opened
  useEffect(() => {
    if (cmdOpen) setTimeout(() => cmdInputRef.current?.focus(), 50);
  }, [cmdOpen]);

  // Stripe redirect handling
  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      toast('Plan upgraded successfully! Welcome to Pro.', 'success');
      navigate('/dashboard', { replace: true });
    } else if (searchParams.get('cancelled') === 'true') {
      toast('Upgrade cancelled — you are still on the free plan.', 'info');
      navigate('/dashboard', { replace: true });
    }
  }, [searchParams, toast, navigate]);

  if (authLoading) return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0c' }}>
      <div style={{ width: 240, background: '#111113', borderRight: '1px solid rgba(255,255,255,0.06)' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 52, borderBottom: '1px solid rgba(255,255,255,0.06)' }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    </div>
  );

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const orgName = org?.name || 'My Organization';
  const planName = (org?.plan || 'free').toUpperCase();
  const firstInit = userName.charAt(0).toUpperCase();

  const handleLogout = async () => { await signOut(); navigate('/'); };

  // Billing Actions
  const handleUpgrade = async (plan) => {
    setUpgradeLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
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
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/v1/billing/portal`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch {
      toast('Billing portal unavailable.', 'error');
    }
  };

  // Submit operations mapping to Mutations
  const handleRegisterAgentSubmit = (e) => {
    e.preventDefault();
    if (!agentForm.name.trim()) return;
    registerAgentMutation.mutate(agentForm, {
      onSuccess: () => {
        setAgentForm({ name: '', module: '', description: '' });
        setShowAgentModal(false);
        toast('Agent registered!', 'success');
      },
      onError: (err) => {
        toast(err.message || 'Failed to register agent', 'error');
      }
    });
  };

  const handleAddWorkspaceSubmit = (e) => {
    e.preventDefault();
    if (!wsForm.name.trim()) return;
    addWorkspaceMutation.mutate(wsForm, {
      onSuccess: () => {
        setWsForm({ name: '', branch: 'main', stack: '' });
        setShowWsModal(false);
        toast('Workspace added!', 'success');
      },
      onError: (err) => {
        toast(err.message || 'Failed to add workspace', 'error');
      }
    });
  };

  const handleCreateKISubmit = (e) => {
    e.preventDefault();
    if (!kiForm.name.trim()) return;
    createKIMutation.mutate(kiForm, {
      onSuccess: () => {
        setKiForm({ name: '', summary: '', content: '' });
        setShowKiModal(false);
        toast('Knowledge item created!', 'success');
      },
      onError: (err) => {
        toast(err.message || 'Failed to create knowledge item', 'error');
      }
    });
  };

  const handleCaptureSubmit = (e) => {
    e.preventDefault();
    if (!captureForm.title.trim()) return;
    setCaptureLoading(true);
    captureMutation.mutate(captureForm, {
      onSuccess: () => {
        setCaptureForm({ type: 'note', title: '', content: '' });
        onCaptureRef.current?.();
        toast('Observation captured!', 'success');
        setCaptureLoading(false);
      },
      onError: () => {
        toast('Failed to capture observation. Try again.', 'error');
        setCaptureLoading(false);
      }
    });
  };

  const handleGenerateApiKeySubmit = () => {
    setKeyGenLoading(true);
    generateKeyMutation.mutate(undefined, {
      onSuccess: (newKey) => {
        setApiKey(newKey.key);
        toast("API key generated — copy it now, it won't be shown again", 'success');
      },
      onError: (err) => {
        toast(err.message || 'Failed to generate key', 'error');
      },
      onSettled: () => {
        setKeyGenLoading(false);
      }
    });
  };

  const handleRevokeApiKeySubmit = (k) => {
    if (!window.confirm('Revoke this API key? Agents using it will stop working.')) return;
    revokeKeyMutation.mutate(k.id, {
      onSuccess: () => {
        toast('API key revoked', 'info');
      },
      onError: () => {
        toast('Failed to revoke key', 'error');
      }
    });
  };

  const handleSeedDemoSubmit = () => {
    setSeedLoading(true);
    seedDemoMutation.mutate(undefined, {
      onSuccess: () => {
        toast('Demo data loaded successfully! Explore Traces, Memory, Compliance, and the network Graph.', 'success');
      },
      onError: () => {
        toast('Failed to seed demo data', 'error');
      },
      onSettled: () => {
        setSeedLoading(false);
      }
    });
  };

  const handleDeleteObsSubmit = (obsId) => {
    if (!window.confirm('Delete this observation?')) return;
    deleteObsMutation.mutate(obsId, {
      onSuccess: () => {
        toast('Observation deleted', 'info');
      },
      onError: () => {
        toast('Failed to delete observation', 'error');
      }
    });
  };

  const toggleAgentStatusSubmit = (agentId, currentStatus) => {
    const AGENT_STATUSES = ['running', 'idle', 'paused', 'disabled'];
    const currentIdx = AGENT_STATUSES.indexOf(currentStatus || 'idle');
    const nextStatus = AGENT_STATUSES[(currentIdx + 1) % AGENT_STATUSES.length];
    toggleAgentStatusMutation.mutate({ agentId, nextStatus }, {
      onSuccess: (updatedAgent) => {
        if (selectedAgent?.id === agentId) setSelectedAgent(updatedAgent);
        toast(`Agent → ${nextStatus}`, 'success');
      },
      onError: () => {
        toast('Failed to update status', 'error');
      }
    });
  };

  const handleRunAgentSubmit = async (agentId, task, workspaceId) => {
    return new Promise((resolve) => {
      runAgentMutation.mutate({ agentId, task, workspaceId }, {
        onSuccess: (body) => {
          if (selectedAgent?.id === agentId) setSelectedAgent(body.agent);
          toast('✨ Agent execution completed successfully!', 'success');
          resolve(body);
        },
        onError: (err) => {
          toast(err.message || 'Agent execution failed', 'error');
          resolve({ error: err.message || 'Agent execution failed' });
        }
      });
    });
  };

  return (
    <div className="dash">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>

      <CommandPalette
        cmdOpen={cmdOpen} setCmdOpen={setCmdOpen}
        cmdQuery={cmdQuery} setCmdQuery={setCmdQuery}
        cmdInputRef={cmdInputRef} setActiveTab={setActiveTab}
      />

      <Sidebar
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        activeTab={activeTab} setActiveTab={setActiveTab}
        liveAgents={liveAgents} errorAgents={errorAgents}
        planName={planName} handleLogout={handleLogout}
        mobileSidebarOpen={mobileSidebarOpen} setMobileSidebarOpen={setMobileSidebarOpen}
        setShowAgentModal={setShowAgentModal}
        setCmdOpen={setCmdOpen}
      />

      <div className="dash-body" id="main-content">
        <Topbar
          activeTab={activeTab} setActiveTab={setActiveTab}
          setCmdOpen={setCmdOpen} setCmdQuery={setCmdQuery}
          liveAgents={liveAgents}
          userName={userName} orgName={orgName} firstInit={firstInit}
          onMobileMenuToggle={() => setMobileSidebarOpen(o => !o)}
        />

        <ErrorBoundary>
          <Suspense fallback={<TabSkeleton />}>
            {activeTab === 'overview' && (
              <OverviewTab
                stats={stats} agents={agents} observations={observations}
                workspaces={workspaces}
                liveAgents={liveAgents} errorAgents={errorAgents}
                usage={{ count: usageCount, limit: usageLimit }} usagePct={usagePct} planName={planName}
                captureForm={captureForm} setCaptureForm={setCaptureForm}
                captureLoading={captureLoading}
                handleCapture={handleCaptureSubmit}
                handleSeedDemo={handleSeedDemoSubmit}
                seedLoading={seedLoading}
                setShowAgentModal={setShowAgentModal} setActiveTab={setActiveTab}
                placeholderIdx={placeholderIdx} onCaptureRef={onCaptureRef}
              />
            )}

            {activeTab === 'agents' && (
              <AgentsTab
                agents={agents}
                setShowAgentModal={setShowAgentModal}
                setSelectedAgent={setSelectedAgent}
                handleSeedDemo={handleSeedDemoSubmit}
                seedLoading={seedLoading}
              />
            )}

            {activeTab === 'workspaces' && (
              <WorkspacesTab
                workspaces={workspaces}
                observations={observations}
                agents={agents}
                setShowWsModal={setShowWsModal}
                toast={toast}
              />
            )}

            {activeTab === 'brain' && (
              <BrainTab
                observations={observations}
                brainFilter={brainFilter} setBrainFilter={setBrainFilter}
                obsSearch={obsSearch} setObsSearch={setObsSearch}
                expandedObs={expandedObs} setExpandedObs={setExpandedObs}
                handleDeleteObs={handleDeleteObsSubmit}
                handleSeedDemo={handleSeedDemoSubmit}
                seedLoading={seedLoading}
                knowledgeItems={knowledgeItems} setShowKiModal={setShowKiModal}
              />
            )}

            {activeTab === 'graph' && (
              <GraphTab
                observations={observations}
                agents={agents}
                handleUpgrade={handleUpgrade}
                upgradeLoading={upgradeLoading}
                toast={toast}
              />
            )}

            {activeTab === 'traces' && (
              <TracesTab
                traces={traces}
                traceStats={traceStats}
                observations={observations}
                agents={agents}
                planName={planName}
              />
            )}

            {activeTab === 'commandcenter' && (
              <CommandCenterTab
                agents={agents}
                workspaces={workspaces}
                observations={observations}
                knowledgeItems={knowledgeItems}
                stats={stats}
                usage={{ count: usageCount, limit: usageLimit }}
              />
            )}

            {activeTab === 'workflows' && (
              <WorkflowsTab
                agents={agents} observations={observations} workspaces={workspaces}
                planName={planName}
                handleUpgrade={handleUpgrade}
              />
            )}

            {activeTab === 'memory' && (
              <MemoryTab />
            )}


            {activeTab === 'chat' && (
              <ChatTab agents={agents} />
            )}

            {activeTab === 'inbox' && (
              <InboxTab org={org} />
            )}

            {activeTab === 'integrations' && (
              <IntegrationsTab org={org} toast={toast} />
            )}

            {activeTab === 'templates' && (
              <TemplatesTab org={org} toast={toast} onAgentCreated={agentsLoading ? undefined : () => {}} />
            )}

            {activeTab === 'skills' && (
              <SkillsTab agents={agents} />
            )}

            {activeTab === 'teamhq' && (
              <TeamHQTab
                planName={planName}
                handleUpgrade={handleUpgrade}
                upgradeLoading={upgradeLoading}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                userName={userName} user={user} orgName={orgName} planName={planName}
                handleUpgrade={handleUpgrade}
                upgradeLoading={upgradeLoading}
                handleManageSubscription={handleManageSubscription}
                apiKey={apiKey} apiKeys={apiKeys}
                handleGenerateKey={handleGenerateApiKeySubmit}
                handleRevokeKey={handleRevokeApiKeySubmit}
                keyGenLoading={keyGenLoading}
                handleLogout={handleLogout} toast={toast}
              />
            )}
          </Suspense>
        </ErrorBoundary>
      </div>

      <OnboardingTour
        isNewUser={isNewUser}
        agents={agents}
        observations={observations}
        apiKey={apiKey}
        userName={userName}
        planName={org?.plan || 'free'}
        setActiveTab={setActiveTab}
        onCaptureRef={onCaptureRef}
      />

      <WelcomeModal
        show={isNewUser && !showWelcome}
        onClose={() => setShowWelcome(false)}
        onGetStarted={() => { setShowWelcome(false); setActiveTab('chat'); }}
      />

      <ToastContainer toasts={toasts} />

      <AgentModal
        show={showAgentModal} agentForm={agentForm} setAgentForm={setAgentForm}
        onSubmit={handleRegisterAgentSubmit}
        onClose={() => setShowAgentModal(false)}
      />

      <WorkspaceModal
        show={showWsModal} wsForm={wsForm} setWsForm={setWsForm}
        onSubmit={handleAddWorkspaceSubmit}
        onClose={() => setShowWsModal(false)}
      />

      <AgentDetailModal
        agent={selectedAgent} onClose={() => setSelectedAgent(null)}
        onToggleStatus={(id, status) => toggleAgentStatusSubmit(id, status)}
        onRunAgent={handleRunAgentSubmit}
        workspaces={workspaces}
      />

      <KnowledgeItemModal
        show={showKiModal} kiForm={kiForm} setKiForm={setKiForm}
        onSubmit={handleCreateKISubmit}
        onClose={() => setShowKiModal(false)}
      />
    </div>
  );
}
