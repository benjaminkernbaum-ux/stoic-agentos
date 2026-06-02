import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import OnboardingTour from '../../components/OnboardingTour';
import ErrorBoundary from '../../components/ErrorBoundary';
import ChatAssistant from '../../components/ChatAssistant';
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
import MemoryTab from './tabs/MemoryTab';
import ComplianceTab from './tabs/ComplianceTab';
import TeamHQTab from './tabs/TeamHQTab';
import ChatTab from './tabs/ChatTab';
import InboxTab from './tabs/InboxTab';
import IntegrationsTab from './tabs/IntegrationsTab';
import TemplatesTab from './tabs/TemplatesTab';
import SkillsTab from './tabs/SkillsTab';
import WelcomeModal from './components/WelcomeModal';

import '../Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, org, signOut, loading: authLoading } = useAuth();
  const { toasts, show: toast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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
  const [showWelcome, setShowWelcome] = useState(() => localStorage.getItem('stoic_welcome_done') === 'true');

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
    setWorkspaces: data.setWorkspaces,
  });



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

  const liveAgents  = useMemo(() => data.agents.filter(a => a.status === 'running').length, [data.agents]);
  const errorAgents = useMemo(() => data.agents.filter(a => a.status === 'error').length, [data.agents]);
  const usagePct    = useMemo(() => data.usage.limit > 0 ? ((data.usage.count / data.usage.limit) * 100).toFixed(1) : 0, [data.usage]);
  const userName    = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const orgName     = org?.name || 'My Organization';
  const planName    = (org?.plan || 'free').toUpperCase();
  const firstInit   = userName.charAt(0).toUpperCase();
  const isNewUser   = !data.dataLoading && data.agents.length === 0 && data.observations.length === 0 && data.workspaces.length === 0;

  const handleLogout = async () => { await signOut(); navigate('/'); };

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
        {activeTab === 'overview' && (
          <OverviewTab
            stats={data.stats} agents={data.agents} observations={data.observations}
            workspaces={data.workspaces}
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
          <WorkspacesTab
            workspaces={data.workspaces}
            observations={data.observations}
            agents={data.agents}
            setShowWsModal={setShowWsModal}
            toast={toast}
          />
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
            observations={data.observations}
            agents={data.agents}
            handleUpgrade={(plan) => actions.handleUpgrade(plan, setUpgradeLoading)}
            upgradeLoading={upgradeLoading}
            toast={toast}
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
          <CommandCenterTab
            agents={data.agents}
            workspaces={data.workspaces}
            observations={data.observations}
            knowledgeItems={data.knowledgeItems}
            stats={data.stats}
            usage={data.usage}
          />
        )}

        {activeTab === 'workflows' && (
          <WorkflowsTab
            agents={data.agents} observations={data.observations} workspaces={data.workspaces}
            planName={planName}
            handleUpgrade={(plan) => actions.handleUpgrade(plan, setUpgradeLoading)}
          />
        )}

        {activeTab === 'memory' && (
          <MemoryTab />
        )}

        {activeTab === 'compliance' && (
          <ComplianceTab />
        )}

        {activeTab === 'chat' && (
          <ChatTab agents={data.agents} />
        )}

        {activeTab === 'inbox' && (
          <InboxTab org={org} />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsTab org={org} toast={toast} />
        )}

        {activeTab === 'templates' && (
          <TemplatesTab org={org} toast={toast} onAgentCreated={data.fetchData} />
        )}

        {activeTab === 'skills' && (
          <SkillsTab agents={data.agents} />
        )}

        {activeTab === 'teamhq' && (
          <TeamHQTab
            planName={planName}
            handleUpgrade={(plan) => actions.handleUpgrade(plan, setUpgradeLoading)}
            upgradeLoading={upgradeLoading}
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
        </ErrorBoundary>
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

      <WelcomeModal
        show={isNewUser && !showWelcome}
        onClose={() => { setShowWelcome(true); localStorage.setItem('stoic_welcome_done', 'true'); }}
        onGetStarted={() => { setShowWelcome(true); localStorage.setItem('stoic_welcome_done', 'true'); setActiveTab('chat'); }}
      />

      <ChatAssistant />

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
