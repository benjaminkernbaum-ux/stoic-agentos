import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import OnboardingTour from '../../components/OnboardingTour';
import { useToast, ToastContainer } from './hooks/useToast.jsx';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardActions } from './hooks/useDashboardActions';
import { CAPTURE_HINTS } from './constants';

// Components
import CommandPalette from './components/CommandPalette';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { AgentModal, WorkspaceModal, AgentDetailModal, KnowledgeItemModal } from './components/Modals';

// Tabs
import OverviewTab from './tabs/OverviewTab';
import AgentsTab from './tabs/AgentsTab';
import WorkspacesTab from './tabs/WorkspacesTab';
import BrainTab from './tabs/BrainTab';
import GraphTab from './tabs/GraphTab';
import TracesTab from './tabs/TracesTab';
import WorkflowsTab from './tabs/WorkflowsTab';
import CommandCenterTab from './tabs/CommandCenterTab';
import SettingsTab from './tabs/SettingsTab';

import '../Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, org, signOut, loading: authLoading } = useAuth();
  const { toasts, show: toast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [time, setTime] = useState(new Date());
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [brainFilter, setBrainFilter] = useState('all');

  const [captureForm, setCaptureForm] = useState({ type: 'note', title: '', content: '' });
  const [captureLoading, setCaptureLoading] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [keyGenLoading, setKeyGenLoading] = useState(false);

  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showWsModal, setShowWsModal] = useState(false);
  const [showKiModal, setShowKiModal] = useState(false);
  const [agentForm, setAgentForm] = useState({ name: '', module: '', description: '' });
  const [wsForm, setWsForm] = useState({ name: '', branch: 'main', stack: '' });
  const [kiForm, setKiForm] = useState({ name: '', summary: '', content: '' });
  const [expandedObs, setExpandedObs] = useState(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [obsSearch, setObsSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  const onCaptureRef = useRef(null);
  const cmdInputRef = useRef(null);

  // Data hook
  const data = useDashboardData(org);

  // Actions hook
  const actions = useDashboardActions({
    org, toast, fetchData: data.fetchData,
    setAgents: data.setAgents, setObservations: data.setObservations,
    setStats: data.setStats, setUsage: data.setUsage,
    setApiKeys: data.setApiKeys, setKnowledgeItems: data.setKnowledgeItems,
  });

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Rotate capture placeholder
  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % CAPTURE_HINTS.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Cmd+K palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
        setCmdQuery('');
      }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus cmd input when opened
  useEffect(() => {
    if (cmdOpen) setTimeout(() => cmdInputRef.current?.focus(), 50);
  }, [cmdOpen]);

  // Stripe redirect handling
  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      toast('Plan upgraded successfully! Welcome to Pro.', 'success');
      window.history.replaceState({}, '', '/dashboard');
    } else if (searchParams.get('cancelled') === 'true') {
      toast('Upgrade cancelled — you are still on the free plan.', 'info');
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  if (authLoading) return null;

  const liveAgents  = data.agents.filter(a => a.status === 'running').length;
  const errorAgents = data.agents.filter(a => a.status === 'error').length;
  const usagePct    = data.usage.limit > 0 ? ((data.usage.count / data.usage.limit) * 100).toFixed(1) : 0;
  const userName    = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const orgName     = org?.name || 'My Organization';
  const planName    = (org?.plan || 'free').toUpperCase();
  const firstInit   = userName.charAt(0).toUpperCase();
  const isNewUser   = !data.dataLoading && data.agents.length === 0 && data.observations.length === 0 && data.workspaces.length === 0;

  const handleLogout = async () => { await signOut(); navigate('/'); };

  return (
    <div className="dash">

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
      />

      <div className="dash-body">
        <Topbar
          activeTab={activeTab} setActiveTab={setActiveTab}
          setCmdOpen={setCmdOpen} setCmdQuery={setCmdQuery}
          liveAgents={liveAgents} time={time}
          userName={userName} orgName={orgName} firstInit={firstInit}
        />

        {activeTab === 'overview' && (
          <OverviewTab
            stats={data.stats} agents={data.agents} observations={data.observations}
            liveAgents={liveAgents} errorAgents={errorAgents}
            usage={data.usage} usagePct={usagePct} planName={planName}
            captureForm={captureForm} setCaptureForm={setCaptureForm}
            captureLoading={captureLoading}
            handleCapture={(e) => actions.handleCapture(e, captureForm, setCaptureForm, setCaptureLoading, onCaptureRef)}
            handleSeedDemo={() => actions.handleSeedDemo(setSeedLoading)}
            seedLoading={seedLoading}
            setShowAgentModal={setShowAgentModal} setActiveTab={setActiveTab}
            placeholderIdx={placeholderIdx} onCaptureRef={onCaptureRef}
          />
        )}

        {activeTab === 'agents' && (
          <AgentsTab
            agents={data.agents}
            setShowAgentModal={setShowAgentModal}
            setSelectedAgent={setSelectedAgent}
            handleSeedDemo={() => actions.handleSeedDemo(setSeedLoading)}
            seedLoading={seedLoading}
          />
        )}

        {activeTab === 'workspaces' && (
          <WorkspacesTab workspaces={data.workspaces} setShowWsModal={setShowWsModal} />
        )}

        {activeTab === 'brain' && (
          <BrainTab
            observations={data.observations}
            brainFilter={brainFilter} setBrainFilter={setBrainFilter}
            obsSearch={obsSearch} setObsSearch={setObsSearch}
            expandedObs={expandedObs} setExpandedObs={setExpandedObs}
            handleDeleteObs={(id) => actions.handleDeleteObs(id)}
            handleSeedDemo={() => actions.handleSeedDemo(setSeedLoading)}
            seedLoading={seedLoading}
            knowledgeItems={data.knowledgeItems} setShowKiModal={setShowKiModal}
          />
        )}

        {activeTab === 'graph' && (
          <GraphTab
            observations={data.observations} agents={data.agents}
            handleUpgrade={(plan) => actions.handleUpgrade(plan, setUpgradeLoading)}
            upgradeLoading={upgradeLoading} toast={toast}
          />
        )}

        {activeTab === 'traces' && (
          <TracesTab
            traces={data.traces}
            traceStats={data.traceStats}
            observations={data.observations}
            agents={data.agents}
            planName={planName}
          />
        )}

        {activeTab === 'commandcenter' && (
          <CommandCenterTab />
        )}

        {activeTab === 'workflows' && (
          <WorkflowsTab
            agents={data.agents} observations={data.observations} workspaces={data.workspaces}
            planName={planName}
            handleUpgrade={(plan) => actions.handleUpgrade(plan, setUpgradeLoading)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            userName={userName} user={user} orgName={orgName} planName={planName}
            handleUpgrade={(plan) => actions.handleUpgrade(plan, setUpgradeLoading)}
            upgradeLoading={upgradeLoading}
            handleManageSubscription={actions.handleManageSubscription}
            apiKey={apiKey} apiKeys={data.apiKeys}
            handleGenerateKey={() => actions.handleGenerateKey(setKeyGenLoading, setApiKey)}
            handleRevokeKey={(k) => actions.handleRevokeKey(k)}
            keyGenLoading={keyGenLoading}
            handleLogout={handleLogout} toast={toast}
          />
        )}
      </div>

      <OnboardingTour
        isNewUser={isNewUser}
        agents={data.agents}
        observations={data.observations}
        apiKey={apiKey}
        userName={userName}
        planName={org?.plan || 'free'}
        setActiveTab={setActiveTab}
        onCaptureRef={onCaptureRef}
      />

      <ToastContainer toasts={toasts} />

      <AgentModal
        show={showAgentModal} agentForm={agentForm} setAgentForm={setAgentForm}
        onSubmit={(e) => actions.handleRegisterAgent(e, agentForm, setAgentForm, setShowAgentModal)}
        onClose={() => setShowAgentModal(false)}
      />

      <WorkspaceModal
        show={showWsModal} wsForm={wsForm} setWsForm={setWsForm}
        onSubmit={(e) => actions.handleAddWorkspace(e, wsForm, setWsForm, setShowWsModal)}
        onClose={() => setShowWsModal(false)}
      />

      <AgentDetailModal
        agent={selectedAgent} onClose={() => setSelectedAgent(null)}
        onToggleStatus={(id, status) => actions.toggleAgentStatus(id, status, setSelectedAgent)}
      />

      <KnowledgeItemModal
        show={showKiModal} kiForm={kiForm} setKiForm={setKiForm}
        onSubmit={(e) => actions.handleCreateKI(e, kiForm, setKiForm, setShowKiModal)}
        onClose={() => setShowKiModal(false)}
      />
    </div>
  );
}
