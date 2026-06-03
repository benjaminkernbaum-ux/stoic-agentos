import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LandingPage.css';
import InfraSimulation from '../components/InfraSimulation';
import NeuralHeroCanvas from '../components/NeuralHeroCanvas';
import ParticleMesh from '../components/ParticleMesh';
import AnimatedCounter from '../components/AnimatedCounter';
import MarketConsolidation from '../components/MarketConsolidation';
import PricingCalculator from '../components/PricingCalculator';
import WaitlistCapture from '../components/WaitlistCapture';

const NAV_LINKS = ['Features', 'SDK', 'Pricing', 'Docs'];

const FEATURES = [
  { icon: '🤖', color: 'rgba(155,89,255,0.12)', title: 'Agent Fleet Monitoring', desc: 'Track 100+ AI agents across departments. Real-time status, execution history, and performance metrics in one dashboard.' },
  { icon: '🧠', color: 'rgba(77,124,255,0.12)', title: 'Knowledge Brain', desc: 'Persistent memory across all AI sessions. Auto-capture decisions, discoveries, and architectural changes. Never lose context again.' },
  { icon: '🕸️', color: 'rgba(0,212,255,0.12)', title: 'Knowledge Graph', desc: 'Interactive force-directed visualization of your codebase relationships. See how agents, files, and workflows connect.' },
  { icon: '📦', color: 'rgba(0,230,138,0.12)', title: 'Multi-Workspace', desc: 'Manage 50+ repos from a single pane of glass. Git status, branches, dirty files, and context routing across projects.' },
  { icon: '⚡', color: 'rgba(255,159,67,0.12)', title: 'Auto-Capture Hooks', desc: 'Git post-commit hooks auto-log every change. Scheduled brain refresh keeps knowledge items fresh without manual work.' },
  { icon: '🔧', color: 'rgba(255,107,157,0.12)', title: 'SDK & API Access', desc: 'npm install stoic-agentos-sdk — wrap any agent in 3 lines of code. Full REST API with API key management and webhook integrations.' },
];

const PRICING = [
  { name: 'Free', desc: 'For solo developers', price: '$0', period: '', features: ['2 workspaces', '5 agents', '10,000 obs/mo', '5 knowledge items', '3 git hook repos', '1 member', 'Community support'], disabled: ['Knowledge Graph', 'Trace Timeline', 'SSO/SAML'], cta: 'Get Started Free', style: 'default' },
  { name: 'Pro', desc: 'For power users', price: '$29', period: '/mo', features: ['10 workspaces', '25 agents', '100,000 obs/mo', '25 knowledge items', '15 git hook repos', '5 team members', 'Knowledge Graph', 'Trace Timeline', 'Full API access', 'Email support (48h)'], disabled: ['SSO/SAML'], cta: 'Start 14-Day Trial', style: 'featured' },
  { name: 'Team', desc: 'For growing teams', price: '$79', period: '/mo', features: ['Unlimited workspaces', '100 agents', 'Unlimited observations', 'Unlimited knowledge items', 'Unlimited git hooks', '15 team members', 'Knowledge Graph', 'Trace Timeline', 'Full API access', 'Priority support (4h)'], disabled: ['SSO/SAML'], cta: 'Start 14-Day Trial', style: 'default' },
  { name: 'Enterprise', desc: 'For organizations', price: 'Custom', period: '', features: ['Everything in Team', 'Unlimited agents', 'Unlimited observations', 'Unlimited members', 'SSO/SAML', 'Self-hosted (coming soon)', 'Custom integrations', 'Dedicated CSM', 'SLA guarantee', 'Audit logs'], disabled: [], cta: 'Contact Sales', style: 'default' },
];

const COMPARE = [
  { feature: 'Agent Fleet Monitoring', us: '✅', langsmith: '✅', langfuse: '✅', braintrust: '✅', agentops: '🟡' },
  { feature: 'Three-Tier Memory System', us: '✅', langsmith: '❌', langfuse: '❌', braintrust: '❌', agentops: '❌' },
  { feature: 'Knowledge Graph', us: '✅', langsmith: '❌', langfuse: '❌', braintrust: '❌', agentops: '❌' },
  { feature: 'Multi-Repo Workspace', us: '✅', langsmith: '❌', langfuse: '❌', braintrust: '❌', agentops: '❌' },
  { feature: 'Eval Framework', us: '🟡', langsmith: '✅', langfuse: '✅', braintrust: '✅', agentops: '🟡' },
  { feature: 'Compliance & Audit Log', us: '✅', langsmith: '❌', langfuse: '❌', braintrust: '❌', agentops: '❌' },
  { feature: 'AI Chat (Claude-Powered)', us: '✅', langsmith: '❌', langfuse: '❌', braintrust: '❌', agentops: '❌' },
  { feature: 'Circuit Breakers', us: '✅', langsmith: '❌', langfuse: '❌', braintrust: '❌', agentops: '❌' },
  { feature: 'Open-Source Core', us: '✅', langsmith: '❌', langfuse: '✅', braintrust: '❌', agentops: '✅' },
];




/* ─── TECHNICAL FEATURE GRID (ENTERPRISE) ─── */
const TECH_FEATURES = [
  { icon: '🧠', title: 'RC-TCF Cognitive Architecture', desc: 'Proprietary context window management preventing hallucination cascades. Deterministic routing for complex agentic workflows.' },
  { icon: '🗄️', title: 'Three-Tier Memory System', desc: 'Working, Episodic, and Semantic memory persistence. Agents retrieve past learnings seamlessly across independent sessions.' },
  { icon: '🛡️', title: 'Enterprise Compliance Module', desc: 'Immutable audit logs, token circuit breakers, and RBAC governance. SOC 2 Type II and HIPAA ready architecture.' },
];

/* ─── WHY I BUILT THIS ─── */
const FOUNDER_STORY = [
  {
    icon: '🚀',
    color: '#9b59ff',
    title: 'The Origin',
    text: 'I was managing 26 AI agents across 5 workspaces — content writers, code reviewers, data pipelines — with zero visibility into what they were doing, deciding, or breaking.',
  },
  {
    icon: '🧠',
    color: '#4d7cff',
    title: 'The Problem',
    text: 'Every time an agent made a decision, that context was lost. Every error was a surprise. Switching between dashboards, logs, and Slack alerts was killing my productivity.',
  },
  {
    icon: '⚡',
    color: '#00e68a',
    title: 'The Solution',
    text: 'So I built AgentOS — one command center for the entire fleet. Three-tier memory, compliance audit logs, Claude-powered AI chat, and a real-time dashboard. Now shipping it for every team that runs AI agents.',
  },
];

const LOGOS = [
  { name: 'Anthropic', icon: '◆' },
  { name: 'Claude AI', icon: '🧠' },
  { name: 'Vercel', icon: '▲' },
  { name: 'Supabase', icon: '⚡' },
  { name: 'Railway', icon: '🚂' },
  { name: 'Stripe', icon: '💳' },
  { name: 'React 19', icon: '⚛️' },
  { name: 'TypeScript', icon: '📘' },
];

/* ─── REAL PRODUCTION AGENTS ─── */
const DEMO_AGENTS = [
  { name: 'production-monitor', status: 'running', module: 'infra', runs: 1243 },
  { name: 'content-writer', status: 'running', module: 'content', runs: 892 },
  { name: 'code-reviewer', status: 'running', module: 'devtools', runs: 567 },
  { name: 'data-pipeline', status: 'running', module: 'pipeline', runs: 334 },
  { name: 'customer-support', status: 'running', module: 'support', runs: 201 },
  { name: 'lead-scorer', status: 'running', module: 'sales', runs: 1087 },
];

const DEMO_ACTIVITY = [
  { type: 'decision', title: 'Switched to batch processing for large datasets', time: '2m ago', icon: '🧭' },
  { type: 'deployment', title: 'Deployed v2.4.1 to production', time: '5m ago', icon: '🚀' },
  { type: 'discovery', title: 'Found 23% cost reduction in token usage', time: '12m ago', icon: '💡' },
  { type: 'git_commit', title: 'feat: add webhook retry logic', time: '18m ago', icon: '📝' },
  { type: 'architecture', title: 'Migrated to event-driven pipeline', time: '24m ago', icon: '🏗️' },
];

/* ═══════════════════════════════════════════
   SCROLL REVEAL HOOK
   ═══════════════════════════════════════════ */
function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            // Reveal all children with .section-reveal
            e.target.querySelectorAll('.section-reveal').forEach((child, i) => {
              setTimeout(() => child.classList.add('visible'), i * 100);
            });
            // Also reveal self if it has the class
            if (e.target.classList.contains('section-reveal')) {
              e.target.classList.add('visible');
            }
          }
        });
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ═══════════════════════════════════════════
   LIVE DASHBOARD PREVIEW COMPONENT
   ═══════════════════════════════════════════ */
function LiveDashboardPreview() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [userInteracted, setUserInteracted] = useState(false);
  const [activeAgentIndex, setActiveAgentIndex] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [tickTime, setTickTime] = useState(0);
  const [brainSearch, setBrainSearch] = useState('');
  const [selectedGraphNode, setSelectedGraphNode] = useState('lead-scorer');

  // Interactive States
  const [expandedTrace, setExpandedTrace] = useState(null);
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [workflowStep, setWorkflowStep] = useState(0);
  const [workflowLogs, setWorkflowLogs] = useState(['[System] Idle. Awaiting trigger...']);
  const [rateLimit, setRateLimit] = useState(80);
  const [selfHealing, setSelfHealing] = useState(true);
  const [vectorSync, setVectorSync] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: '🤖 **Stoic AgentOS Assistant**\n\nHow can I help you manage your fleet today? Select a shortcut prompt or type a custom query:' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [memoryConsolidating, setMemoryConsolidating] = useState(false);
  const [memoriesList, setMemoriesList] = useState([
    { id: 'episodic-412', type: 'episodic', content: 'Cached client billing tokens in the encrypted vault.', time: '2m ago' },
    { id: 'semantic-90', type: 'semantic', content: 'Determined lead-scorer works best with Claude 3.5 Sonnet.', time: '12m ago' },
    { id: 'episodic-389', type: 'episodic', content: 'SRE auto-restarted customer-support after rate limits.', time: '40m ago' },
  ]);
  const [complianceAuditing, setComplianceAuditing] = useState(false);
  const [complianceAuditVerified, setComplianceAuditVerified] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [keyGenLoading, setKeyGenLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  
  // Thought Capture Note State
  const [captureNote, setCaptureNote] = useState('');

  // Signal Feed (Inbox) States
  const [signalsList, setSignalsList] = useState([
    { id: 1, level: 'CRITICAL', title: 'Supabase rate-limit warning', desc: 'customer-support agent hit 429 Too Many Requests.', time: 'Just now', rule: 'api_protection' },
    { id: 2, level: 'WARN', title: 'Knowledge persistence latency', desc: 'ephemeral memory pipeline exceeded 800ms threshold.', time: '5m ago', rule: 'memory_latency' },
    { id: 3, level: 'INFO', title: 'Post-commit hook triggered', desc: 'prod-infra repository branch master pushed v2.4.1.', time: '12m ago', rule: 'git_sync' }
  ]);
  const [activeSignalFilter, setActiveSignalFilter] = useState('all');

  // Capabilities (Skills) details inspector
  const [selectedSkill, setSelectedSkill] = useState('fal_ai_video');
  const skillsList = {
    fal_ai_video: { name: 'fal_ai_video', desc: 'Generate high-fidelity cinematic scenes using Flux Pro & Kling Video adapters.', scope: 'read_write_external', usage: 104 },
    eleven_labs_tts: { name: 'eleven_labs_tts', desc: 'Narrate roteiro audio logs using Portuguese (PT-BR) voice synthesis.', scope: 'read_external', usage: 89 },
    git_commit_hook: { name: 'git_commit_hook', desc: 'Post-commit brain syncer capturing code changes into the semantic vector plane.', scope: 'read_write_internal', usage: 1204 },
    web_browser_agent: { name: 'web_browser_agent', desc: 'Interact with target browser pages for analytics gathering and content audits.', scope: 'full_admin_sandbox', usage: 342 }
  };

  // Connected integrations
  const [integrations, setIntegrations] = useState({
    vercel: true,
    supabase: true,
    stripe: false,
    claude: true
  });

  // Invitation link states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Developer');
  const [teamMembers, setTeamMembers] = useState([
    { name: 'Benjamin Kernbaum', email: 'benjamin@stoicagentos.com', role: 'Owner', status: 'Active' },
    { name: 'Sarah Connor', email: 'sarah@stoicagentos.com', role: 'Admin', status: 'Active' },
  ]);

  // Dynamic agents
  const [agentsList, setAgentsList] = useState([
    { name: 'production-monitor', status: 'running', runs: 1243, role: 'Infrastructure SRE', queue: '0 pending', sla: '99.98%' },
    { name: 'content-writer', status: 'running', runs: 892, role: 'Launch Content Engine', queue: '1 generating', sla: '99.5%' },
    { name: 'code-reviewer', status: 'running', runs: 567, role: 'Auto PR Auditor', queue: '0 pending', sla: '99.9%' },
    { name: 'data-pipeline', status: 'running', runs: 334, role: 'Vector DB Aggregator', queue: '12 batching', sla: '98.8%' },
    { name: 'customer-support', status: 'running', runs: 201, role: 'L1 Helpdesk Agent', queue: '2 in queue', sla: '97.2%' },
    { name: 'lead-scorer', status: 'running', runs: 1087, role: 'Sales Intent Scorer', queue: '4 scoring', sla: '99.1%' },
  ]);

  const [logsList, setLogsList] = useState([
    { type: 'decision', title: 'Switched to batch processing for large datasets', time: 'Just now', icon: '🧭' },
    { type: 'deployment', title: 'Deployed v2.4.1 to production', time: '3m ago', icon: '🚀' },
    { type: 'discovery', title: 'Found 23% cost reduction in token usage', time: '8m ago', icon: '💡' },
  ]);

  const [brainMemories, setBrainMemories] = useState([
    { agent: 'code-reviewer', action: 'analyse_pr', decision: 'Approved PR #412 after security check', confidence: 0.98, time: 'Just now' },
    { agent: 'production-monitor', action: 'ping_check', decision: 'All health pings returned 200 OK within 12ms', confidence: 0.99, time: '4s ago' },
    { agent: 'content-writer', action: 'generate_draft', decision: 'Created draft for Twitter launch campaign', confidence: 0.95, time: '12s ago' },
    { agent: 'data-pipeline', action: 'sync_supabase', decision: 'Sync completed: 124 records updated', confidence: 1.00, time: '20s ago' },
  ]);

  // Autoplay cycle tabs every 8.5 seconds
  useEffect(() => {
    if (userInteracted) return;
    const tabInterval = setInterval(() => {
      const tabs = [
        'Overview', 'Mission Comms', 'Signal Feed', 'Agents', 'Blueprints', 
        'Connect Hub', 'Capabilities', 'Command Center', 'Workspaces', 
        'Knowledge Brain', 'Knowledge Graph', 'Agent Traces', 'Workflows', 
        'Memory', 'Compliance', 'Team HQ', 'Settings'
      ];
      setActiveTab(current => {
        const nextIndex = (tabs.indexOf(current) + 1) % tabs.length;
        return tabs[nextIndex];
      });
    }, 8500);
    return () => clearInterval(tabInterval);
  }, [userInteracted]);

  useEffect(() => {
    const cycleAgent = setInterval(() => {
      setActiveAgentIndex(i => (i + 1) % agentsList.length);
      setPulse(true);
      setTimeout(() => setPulse(false), 500);
    }, 3000);
    return () => clearInterval(cycleAgent);
  }, [agentsList.length]);

  useEffect(() => {
    const anim = setInterval(() => setTickTime(t => t + 0.1), 150);
    const runs = setInterval(() => {
      const mult = rateLimit > 120 ? 2 : 1;
      setAgentsList(prev => prev.map(a => a.status === 'running' && Math.random() > 0.4 ? { ...a, runs: a.runs + Math.floor(Math.random() * mult + 1) } : a));
    }, 2500);
    return () => { clearInterval(anim); clearInterval(runs); };
  }, [rateLimit]);

  const toggleAgentStatus = (index) => {
    setUserInteracted(true);
    setAgentsList(prev => prev.map((a, i) => i === index ? { ...a, status: a.status === 'running' ? 'idle' : 'running' } : a));
  };

  const addManualMemory = () => {
    setUserInteracted(true);
    const userMemories = [
      { agent: 'user-override', action: 'manual_trigger', decision: 'Triggered diagnostic check on API gateways', confidence: 1.00 },
      { agent: 'user-override', action: 'inject_cache', decision: 'Pre-warmed observation prefix cache globally', confidence: 0.98 },
    ];
    const selected = userMemories[Math.floor(Math.random() * userMemories.length)];
    setBrainMemories(prev => [{ ...selected, time: 'Just now' }, ...prev]);
  };

  const handleCaptureSubmit = (e) => {
    e.preventDefault();
    if (!captureNote.trim()) return;
    setUserInteracted(true);
    const newLog = {
      type: 'note',
      title: captureNote,
      time: 'Just now',
      icon: '📌'
    };
    setLogsList(prev => [newLog, ...prev]);
    
    // Also inject into semantic brain console
    const newMemory = {
      agent: 'user-capture',
      action: 'note_persist',
      decision: `Persisted note: "${captureNote}"`,
      confidence: 1.00,
      time: 'Just now'
    };
    setBrainMemories(prev => [newMemory, ...prev]);
    setCaptureNote('');
  };

  const startWorkflowRun = () => {
    if (workflowRunning) return;
    setUserInteracted(true);
    setWorkflowRunning(true);
    setWorkflowStep(1);
    setWorkflowLogs(['[System] Initializing TikTok pipeline...']);
    const steps = [
      { msg: '[Pipeline] Fetching script draft from brain memory...', delay: 1000 },
      { msg: '[ElevenLabs] Generating narration (PT-BR voice)...', delay: 2400 },
      { msg: '[Fal.ai] Rendering high-fidelity video scenes...', delay: 4200 },
      { msg: '[FFmpeg] Merging video, audio, and subtitles...', delay: 6200 },
      { msg: '[System] Pipeline Complete! Video draft published successfully.', delay: 8000 }
    ];
    steps.forEach((step, index) => {
      setTimeout(() => {
        setWorkflowStep(index + 2);
        setWorkflowLogs(prev => [...prev, step.msg]);
        if (index === steps.length - 1) setWorkflowRunning(false);
      }, step.delay);
    });
  };

  const deployBlueprint = (agentName, roleName) => {
    setUserInteracted(true);
    // Avoid duplicates
    if (agentsList.some(a => a.name === agentName)) {
      alert(`${agentName} is already deployed!`);
      return;
    }
    const newAgent = {
      name: agentName,
      status: 'running',
      runs: 0,
      role: roleName,
      queue: '0 pending',
      sla: '99.9%'
    };
    setAgentsList(prev => [...prev, newAgent]);
    alert(`🚀 Deployed ${agentName} successfully! Visit the "Agents" tab to inspect telemetry.`);
  };

  const handleChatPreset = (presetText) => {
    if (chatLoading) return;
    setUserInteracted(true);
    setChatMessages(prev => [...prev, { sender: 'user', text: presetText }]);
    setChatLoading(true);
    setTimeout(() => {
      let reply = '';
      if (presetText.includes('Failures')) {
        reply = '🔍 **Fleet Health Audit**\n\nI identified **1 anomaly** inside `customer-support`:\n* **Diagnostic:** `Supabase rate-limit reached` on trace `#tr_9x22`.\n* **Mitigation:** Self-Healing SRE restarted the worker and pre-warmed prefix cache.';
      } else if (presetText.includes('Cost')) {
        reply = '💸 **Token Savings Report**\n\nBy routing formatting sub-tasks to **Claude 3.5 Haiku** instead of Sonnet, we achieved:\n* **Billing Reduction:** **-42.5%** ($124.00 ➔ $71.30/day).\n* **Average Latency:** **-180ms**.';
      } else {
        reply = '🧬 **Episodic Memory Retrieval**\n\nFound **1 episodic block** for keyword `launch timeline`:\n* **Block ID:** `episodic-412`\n* **Details:** *"Compiled index.html. Custom domain mapping set securely to stoicagentos.com."*\n* **Consolidated Uptime SLA:** `99.98%`';
      }
      setChatMessages(prev => [...prev, { sender: 'ai', text: reply }]);
      setChatLoading(false);
    }, 1200);
  };

  const handleCustomChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    setUserInteracted(true);
    const query = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: query }]);
    setChatInput('');
    setChatLoading(true);
    
    setTimeout(() => {
      let reply = '';
      const lowercaseQuery = query.toLowerCase();
      if (lowercaseQuery.includes('agent') || lowercaseQuery.includes('fleet')) {
        reply = `🤖 **Fleet Analysis**\n\nYou currently have **${agentsList.filter(a => a.status === 'running').length} running agents** out of **${agentsList.length} total**. Average SLA is **99.2%**. Heartbeats are stable.`;
      } else if (lowercaseQuery.includes('memory') || lowercaseQuery.includes('persist')) {
        reply = `🧬 **Memory Plane Status**\n\nWorking memory contains **4 ephemeral blocks**. Ephemeral is consolidated into episodic/semantic plane automatically every 6 hours. Last consolidation was successful.`;
      } else if (lowercaseQuery.includes('compile') || lowercaseQuery.includes('error') || lowercaseQuery.includes('fail')) {
        reply = `⚠️ **SIEM Telemetry Logs**\n\nFound **1 recent warnings** in signal feed. customer-support encountered a brief rate limit which was mitigated by our automatic circuit breakers.`;
      } else {
        reply = `💡 **Telemetry Report**\n\nI analyzed your query: "${query}". System diagnostics are solid. Telemetry signals are routing securely through API gateways at average **124ms** latency. No action required.`;
      }
      setChatMessages(prev => [...prev, { sender: 'ai', text: reply }]);
      setChatLoading(false);
    }, 1000);
  };

  const consolidateMemories = () => {
    if (memoryConsolidating) return;
    setUserInteracted(true);
    setMemoryConsolidating(true);
    setTimeout(() => {
      setMemoryConsolidating(false);
      setMemoriesList(prev => [{ id: `semantic-${Math.floor(Math.random() * 100 + 100)}`, type: 'semantic', content: 'Aggregated recent billing metrics: Identified Stripe endpoints as peak memory consumption peaks.', time: 'Just now' }, ...prev]);
    }, 1500);
  };

  const verifyComplianceLogs = () => {
    if (complianceAuditing) return;
    setUserInteracted(true);
    setComplianceAuditing(true);
    setComplianceAuditVerified(false);
    setTimeout(() => { setComplianceAuditing(false); setComplianceAuditVerified(true); }, 1800);
  };

  const handleGenerateKey = () => {
    setUserInteracted(true);
    setKeyGenLoading(true);
    setTimeout(() => {
      const randHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setGeneratedKey(`sk_live_${randHex}`);
      setKeyGenLoading(false);
      setCopiedKey(false);
    }, 1000);
  };

  const copyKeyToClipboard = () => {
    setCopiedKey(true);
    navigator.clipboard?.writeText(generatedKey);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const toggleIntegration = (key) => {
    setUserInteracted(true);
    setIntegrations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setUserInteracted(true);
    const newMember = {
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'Pending Invite'
    };
    setTeamMembers(prev => [...prev, newMember]);
    setInviteEmail('');
    alert(`📧 Invitation sent to ${inviteEmail}!`);
  };

  const statusColor = { running: '#00e68a', idle: 'rgba(255,255,255,0.25)', success: '#00d4ff', error: '#ff4757', paused: 'rgba(255,255,255,0.25)' };

  // Signals (Inbox) filter logic
  const filteredSignals = signalsList.filter(s => {
    if (activeSignalFilter === 'all') return true;
    return s.level.toLowerCase() === activeSignalFilter;
  });

  return (
    <div className="preview-frame premium-preview-frame">
      {/* Premium Tool Window URL Bar */}
      <div className="preview-bar">
        <div className="preview-dot red" />
        <div className="preview-dot yellow" />
        <div className="preview-dot green" />
        <div className="preview-url">
          <span style={{ color: 'var(--accent-purple)', opacity: 0.6 }}>https://</span>
          stoicagentos.com/dashboard
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {!userInteracted ? (
            <span className="dp-autoplay-badge">⏱️ Autoplay Mode</span>
          ) : (
            <button className="dp-autoplay-reset" onClick={() => setUserInteracted(false)}>▶ Autoplay</button>
          )}
        </div>
      </div>

      <div className="dashboard-preview">
        {/* Navigation Sidebar replicating actual Sidebar structure */}
        <div className="dp-sidebar" style={{ width: '220px', maxHeight: '480px', overflowY: 'auto', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>
          <div className="dp-logo" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '16px' }}>
            <span>⚡</span> Stoic AgentOS
            <span style={{ fontSize: '9px', background: 'rgba(155, 89, 255, 0.2)', padding: '2px 4px', borderRadius: '3px', color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)' }}>v3</span>
          </div>

          {/* Group: MAIN */}
          <div style={{ fontSize: '8px', color: 'var(--text-dim)', letterSpacing: '1px', textTransform: 'uppercase', padding: '0 8px 4px', fontWeight: '800' }}>MAIN</div>
          {[
            { id: 'Mission Comms', icon: '💬' },
            { id: 'Signal Feed', icon: '📡' }
          ].map((item) => (
            <button
              key={item.id}
              className={`dp-nav-item-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.id); setUserInteracted(true); }}
              style={{
                width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', fontSize: '12px', padding: '6px 8px', borderRadius: '5px',
                color: activeTab === item.id ? 'var(--text-primary)' : 'var(--text-dim)',
                background: activeTab === item.id ? 'rgba(155, 89, 255, 0.12)' : 'transparent',
                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: activeTab === item.id ? '600' : '500', marginBottom: '2px'
              }}
            >
              <span>{item.icon}</span> {item.id}
            </button>
          ))}

          {/* Group: EXPLORE */}
          <div style={{ fontSize: '8px', color: 'var(--text-dim)', letterSpacing: '1px', textTransform: 'uppercase', padding: '10px 8px 4px', fontWeight: '800' }}>EXPLORE</div>
          {[
            { id: 'Agents', icon: '🤖' },
            { id: 'Blueprints', icon: '🧬' },
            { id: 'Connect Hub', icon: '🔌' },
            { id: 'Capabilities', icon: '🧩' }
          ].map((item) => (
            <button
              key={item.id}
              className={`dp-nav-item-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.id); setUserInteracted(true); }}
              style={{
                width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', fontSize: '12px', padding: '6px 8px', borderRadius: '5px',
                color: activeTab === item.id ? 'var(--text-primary)' : 'var(--text-dim)',
                background: activeTab === item.id ? 'rgba(155, 89, 255, 0.12)' : 'transparent',
                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: activeTab === item.id ? '600' : '500', marginBottom: '2px'
              }}
            >
              <span>{item.icon}</span> {item.id}
            </button>
          ))}

          {/* Group: OPERATE */}
          <div style={{ fontSize: '8px', color: 'var(--text-dim)', letterSpacing: '1px', textTransform: 'uppercase', padding: '10px 8px 4px', fontWeight: '800' }}>OPERATE</div>
          {[
            { id: 'Command Center', icon: '🎛️' },
            { id: 'Overview', icon: '📊' },
            { id: 'Workspaces', icon: '📦' },
            { id: 'Knowledge Brain', icon: '💡' },
            { id: 'Knowledge Graph', icon: '🕸️' },
            { id: 'Agent Traces', icon: '📈' },
            { id: 'Workflows', icon: '🔗' },
            { id: 'Memory', icon: '🧠' },
            { id: 'Compliance', icon: '🛡️' },
            { id: 'Team HQ', icon: '🏢' }
          ].map((item) => (
            <button
              key={item.id}
              className={`dp-nav-item-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.id); setUserInteracted(true); }}
              style={{
                width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', fontSize: '12px', padding: '6px 8px', borderRadius: '5px',
                color: activeTab === item.id ? 'var(--text-primary)' : 'var(--text-dim)',
                background: activeTab === item.id ? 'rgba(155, 89, 255, 0.12)' : 'transparent',
                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: activeTab === item.id ? '600' : '500', marginBottom: '2px'
              }}
            >
              <span>{item.icon}</span> {item.id}
            </button>
          ))}

          {/* Group: FOOTER */}
          <div style={{ fontSize: '8px', color: 'var(--text-dim)', letterSpacing: '1px', textTransform: 'uppercase', padding: '10px 8px 4px', fontWeight: '800' }}>ACCOUNT</div>
          <button
            className={`dp-nav-item-btn ${activeTab === 'Settings' ? 'active' : ''}`}
            onClick={() => { setActiveTab('Settings'); setUserInteracted(true); }}
            style={{
              width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', fontSize: '12px', padding: '6px 8px', borderRadius: '5px',
              color: activeTab === 'Settings' ? 'var(--text-primary)' : 'var(--text-dim)',
              background: activeTab === 'Settings' ? 'rgba(155, 89, 255, 0.12)' : 'transparent',
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: activeTab === 'Settings' ? '600' : '500', marginBottom: '12px'
            }}
          >
            <span>⚙️</span> Settings
          </button>
        </div>

        {/* Dynamic Showcase Dashboard Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
          
          {/* Top Bar matching actual Topbar */}
          <div className="dp-top-telemetry-bar" style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontSize: '11px', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: '700', color: 'var(--text-primary)' }}>
              <span>📦</span> prod-main
            </div>
            <div className="telemetry-bar-divider" style={{ width: '1px', height: '12px', background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-green)', fontWeight: '600' }}>
              <span style={{ width: 6, height: 6, background: 'var(--accent-green)', borderRadius: '50%', display: 'inline-block' }} />
              {agentsList.filter(a => a.status === 'running').length} Active
            </div>
            <div className="telemetry-bar-divider" style={{ width: '1px', height: '12px', background: 'var(--border)' }} />
            <div style={{ color: 'var(--text-dim)' }}>
              Latency: <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>124ms avg</span>
            </div>
            
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <button 
                onClick={() => { setActiveTab('Mission Comms'); setUserInteracted(true); }}
                className="glowing-brief-btn"
                style={{
                  background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-pink))', border: 'none', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 0 10px rgba(155, 89, 255, 0.4)'
                }}
              >
                ✨ Brief Agent
              </button>
              <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '3px 8px', color: 'var(--text-dim)', fontSize: '9px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>🔍 Search...</span>
                <span style={{ fontSize: '8px', opacity: 0.5 }}>Ctrl+K</span>
              </div>
              <span style={{ color: 'var(--accent-purple)', fontSize: '10px', fontWeight: '700' }}>🏢 ENTERPRISE</span>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '800', color: 'white' }}>
                BK
              </div>
            </div>
          </div>

          <div className="dp-main" style={{ flex: 1, padding: '16px', maxHeight: '420px', overflowY: 'auto' }}>
            
            {/* 1. MISSION COMMS (AI CHAT) */}
            {activeTab === 'Mission Comms' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>💬 Mission Comms — Fleet Command</div>
                  <span className="dp-live-indicator"><span className="dp-live-dot" style={{ background: 'var(--accent-purple)' }} /> BYOK CLAUDE 3.5</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: '8px', height: '170px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {chatMessages.map((msg, mIdx) => (
                      <div key={mIdx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                        <div style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '10px', lineHeight: '1.4', background: msg.sender === 'user' ? 'rgba(155,89,255,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${msg.sender === 'user' ? 'rgba(155,89,255,0.25)' : 'var(--border)'}`, whiteSpace: 'pre-wrap', color: '#fff' }}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {chatLoading && <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>🧠 Reasoning...</div>}
                  </div>
                  
                  {/* Preset triggers & Custom prompt input */}
                  <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
                    {[
                      { txt: '🤖 Analyze Agent Failures' },
                      { txt: '💸 Explain Token Cost Savings' },
                      { txt: '🔍 Retrieve Episodic Memory' }
                    ].map((p, pIdx) => (
                      <button key={pIdx} className="dp-autoplay-reset" onClick={() => handleChatPreset(p.txt)} disabled={chatLoading} style={{ fontSize: '9px', whiteSpace: 'nowrap', borderRadius: '12px', padding: '3px 8px' }}>
                        {p.txt}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleCustomChatSubmit} style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <input 
                      type="text" 
                      placeholder="Ask the fleet AI (e.g. status of agents, memory status)..." 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px 10px', fontSize: '10px', color: 'white', outline: 'none' }}
                    />
                    <button type="submit" className="dp-memory-trigger-btn" style={{ padding: '6px 12px' }}>Send</button>
                  </form>
                </div>
              </div>
            )}

            {/* 2. SIGNAL FEED (INBOX) */}
            {activeTab === 'Signal Feed' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>📡 Signal Feed — Fleet Notifications</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['all', 'critical', 'warn', 'info'].map(f => (
                      <button 
                        key={f} 
                        onClick={() => { setActiveSignalFilter(f); setUserInteracted(true); }}
                        style={{ fontSize: '8px', padding: '2px 6px', borderRadius: '3px', background: activeSignalFilter === f ? 'var(--accent-purple)' : 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', color: '#fff', cursor: 'pointer', textTransform: 'uppercase' }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '220px', overflowY: 'auto' }}>
                  {filteredSignals.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', fontSize: '11px', color: 'var(--text-dim)' }}>No active signals matching filter.</div>
                  ) : (
                    filteredSignals.map(sig => (
                      <div key={sig.id} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: 'var(--bg-card)', border: `1px solid ${sig.level === 'CRITICAL' ? 'rgba(255,71,87,0.2)' : sig.level === 'WARN' ? 'rgba(255,159,67,0.2)' : 'var(--border)'}`, borderRadius: '6px', fontSize: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 4px', borderRadius: '3px', background: sig.level === 'CRITICAL' ? 'rgba(255,71,87,0.12)' : sig.level === 'WARN' ? 'rgba(255,159,67,0.12)' : 'rgba(0,212,255,0.12)', color: sig.level === 'CRITICAL' ? '#ff4757' : sig.level === 'WARN' ? '#ff9f6b' : '#00d4ff', fontFamily: 'var(--font-mono)' }}>
                          {sig.level}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', color: '#fff' }}>{sig.title}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '9px', marginTop: 2 }}>{sig.desc}</div>
                        </div>
                        <span style={{ color: 'var(--text-dim)', fontSize: '9px', fontFamily: 'var(--font-mono)' }}>{sig.time}</span>
                        <button 
                          onClick={() => {
                            setUserInteracted(true);
                            setSignalsList(prev => prev.filter(s => s.id !== sig.id));
                          }}
                          style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', padding: '0 4px' }}
                          title="Dismiss"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 3. AGENTS */}
            {activeTab === 'Agents' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>🤖 Fleet Registry & Telemetry</div>
                  <span className="dp-live-indicator"><span className="dp-live-dot" /> LIVE CONTROLLERS</span>
                </div>
                <div className="dp-agents-interactive-list" style={{ maxHeight: '230px', overflowY: 'auto' }}>
                  {agentsList.map((agent, index) => {
                    const cpuVal = agent.status === 'running' ? Math.floor(35 + Math.sin(tickTime + index) * 20) : 0;
                    const ramVal = agent.status === 'running' ? Math.floor(55 + Math.cos(tickTime / 1.5 + index) * 12) : 0;
                    return (
                      <div key={agent.name} className="dp-agent-controller-card" style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '130px' }}>
                          <div className="dp-acc-dot" style={{ background: statusColor[agent.status], width: 6, height: 6, borderRadius: '50%' }} />
                          <div>
                            <div style={{ fontWeight: '700', color: '#fff', fontFamily: 'var(--font-mono)' }}>{agent.name}</div>
                            <div style={{ fontSize: '8px', color: 'var(--text-dim)' }}>{agent.role}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, flex: 1, alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 2 }}>
                            <span style={{ fontSize: '8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>CPU: {cpuVal}%</span>
                            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: 'var(--accent-cyan)', width: `${cpuVal}%` }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 2 }}>
                            <span style={{ fontSize: '8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>MEM: {ramVal}%</span>
                            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: 'var(--accent-purple)', width: `${ramVal}%` }} />
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '90px', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{agent.runs} runs</span>
                          <button 
                            className={`dp-acc-btn ${agent.status === 'running' ? 'btn-pause' : 'btn-resume'}`} 
                            onClick={() => toggleAgentStatus(index)}
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {agent.status === 'running' ? '⏸' : '▶'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. BLUEPRINTS (TEMPLATES) */}
            {activeTab === 'Blueprints' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>🧬 Blueprints Gallery — Deploy Blueprint</div>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Select to instantly instantiate</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {[
                    { id: 'bible-tiktok-engine', name: 'Bible TikTok engine', role: 'Autonomous Video Pipeline', desc: 'Narrates scripture roteiro + renders Flux Pro images & Kling videos stitched in FFmpeg.' },
                    { id: 'sales-lead-scorer', name: 'sales-lead-scorer', role: 'Lead Intent Profiler', desc: 'Analyzes target signup emails & scores intent, routing leads into CRM sequence.' },
                    { id: 'github-star-growth', name: 'github-star-growth', role: 'Dev Community Optimizer', desc: 'Tracks star progression, submits security audit templates, drafts launch materials.' },
                    { id: 'devops-sre-agent', name: 'devops-sre-agent', role: 'Cluster Healing Monitor', desc: 'Pings microservices, auto-reloads broken Supabase queries, pre-warms observations cache.' }
                  ].map(b => {
                    const alreadyDeployed = agentsList.some(a => a.name === b.name);
                    return (
                      <div key={b.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px 10px', borderRadius: '6px', fontSize: '10px', display: 'flex', flexDirection: 'column', justifycontent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: '700', color: '#fff', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{b.name}</div>
                          <div style={{ fontSize: '8px', color: 'var(--accent-purple)', fontWeight: '600', textTransform: 'uppercase', margin: '2px 0 6px' }}>{b.role}</div>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '9px', lineHeight: '1.3' }}>{b.desc}</p>
                        </div>
                        <button 
                          onClick={() => deployBlueprint(b.name, b.role)}
                          disabled={alreadyDeployed}
                          style={{
                            background: alreadyDeployed ? 'rgba(255,255,255,0.02)' : 'rgba(155, 89, 255, 0.1)',
                            border: `1px solid ${alreadyDeployed ? 'var(--border)' : 'var(--accent-purple)'}`,
                            color: alreadyDeployed ? 'var(--text-dim)' : 'var(--accent-purple)',
                            borderRadius: '4px', padding: '4px', fontSize: '9px', fontWeight: '700', cursor: alreadyDeployed ? 'not-allowed' : 'pointer', marginTop: 8, transition: 'all 0.2s'
                          }}
                        >
                          {alreadyDeployed ? '✓ Deployed Active' : 'Deploy Blueprint →'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. CONNECT HUB (INTEGRATIONS) */}
            {activeTab === 'Connect Hub' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>🔌 Connect Hub — Synced Integrations</div>
                  <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Manage dynamic sync endpoints</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {[
                    { key: 'vercel', name: 'Vercel Deployment', icon: '▲', desc: 'Auto-sync code updates & domains mapping securely.' },
                    { key: 'supabase', name: 'Supabase Vector DB', icon: '⚡', desc: 'Episodic memory chunks sync in PostgreSQL vector.' },
                    { key: 'stripe', name: 'Stripe Billing System', icon: '💳', desc: 'Telemetry checks for user licensing constraints.' },
                    { key: 'claude', name: 'Claude BYOK API', icon: '🧠', desc: 'Routing fleet agent prompts securely.' }
                  ].map(intg => (
                    <div key={intg.key} style={{ display: 'flex', gap: 8, padding: '8px 12px', background: 'var(--bg-card)', border: `1px solid ${integrations[intg.key] ? 'rgba(0,230,138,0.2)' : 'var(--border)'}`, borderRadius: '6px', fontSize: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '18px' }}>{intg.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', color: '#fff' }}>{intg.name}</div>
                        <div style={{ fontSize: '8px', color: 'var(--text-dim)', marginTop: 2 }}>{intg.desc}</div>
                      </div>
                      <button 
                        onClick={() => toggleIntegration(intg.key)}
                        style={{
                          background: integrations[intg.key] ? 'var(--accent-green)' : 'rgba(255,255,255,0.05)',
                          border: 'none', width: '36px', height: '16px', borderRadius: '10px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s'
                        }}
                      >
                        <div style={{ width: '12px', height: '12px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: integrations[intg.key] ? '22px' : '2px', transition: 'left 0.2s' }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. CAPABILITIES (SKILLS) */}
            {activeTab === 'Capabilities' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>🧩 Capabilities & Tool Definitions</div>
                  <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Sandbox permission scopes</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 12, height: '220px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
                    {Object.keys(skillsList).map(key => (
                      <button 
                        key={key} 
                        onClick={() => { setSelectedSkill(key); setUserInteracted(true); }}
                        style={{
                          textAlign: 'left', background: selectedSkill === key ? 'rgba(0, 212, 255, 0.1)' : 'transparent', border: `1px solid ${selectedSkill === key ? 'var(--accent-cyan)' : 'var(--border)'}`, padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', color: '#fff', fontFamily: 'var(--font-mono)'
                        }}
                      >
                        🧩 {skillsList[key].name}
                      </button>
                    ))}
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '12px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{skillsList[selectedSkill].name}()</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{skillsList[selectedSkill].desc}</div>
                    
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '9px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>Sandbox Scope:</span>
                        <span style={{ color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)' }}>{skillsList[selectedSkill].scope}</span>
                      </div>
                      <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '9px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>Total Runs wrapped:</span>
                        <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{skillsList[selectedSkill].usage} calls</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. COMMAND CENTER */}
            {activeTab === 'Command Center' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>📡 CommandCenter Fleet Control</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', marginBottom: 4 }}>
                        <span>🚀 Fleet Rate Limit</span><span style={{ color: 'var(--accent-cyan)' }}>{rateLimit} RPM</span>
                      </div>
                      <input type="range" min="10" max="180" value={rateLimit} onChange={(e) => { setRateLimit(Number(e.target.value)); setUserInteracted(true); }} style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, padding: '8px', background: 'var(--bg-card)', border: `1px solid ${selfHealing ? 'var(--accent-green)' : 'var(--border)'}`, borderRadius: '6px', cursor: 'pointer', textAlign: 'center' }} onClick={() => { setSelfHealing(!selfHealing); setUserInteracted(true); }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#fff' }}>🛡️ SELF-HEALING</div>
                        <div style={{ fontSize: '8px', color: 'var(--text-dim)', marginTop: 2 }}>{selfHealing ? 'ACTIVE' : 'OFF'}</div>
                      </div>
                      <div style={{ flex: 1, padding: '8px', background: 'var(--bg-card)', border: `1px solid ${vectorSync ? 'var(--accent-purple)' : 'var(--border)'}`, borderRadius: '6px', cursor: 'pointer', textAlign: 'center' }} onClick={() => { setVectorSync(!vectorSync); setUserInteracted(true); }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#fff' }}>🧬 VECTOR SYNC</div>
                        <div style={{ fontSize: '8px', color: 'var(--text-dim)', marginTop: 2 }}>{vectorSync ? 'REAL-TIME' : 'OFF'}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
                    <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                      <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="url(#g-purple)" strokeWidth="3" strokeDasharray={`${Math.min(95, 20 + rateLimit / 2.2)}, 100`} strokeLinecap="round" />
                      </svg>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#fff' }}>{Math.floor(20 + rateLimit / 2.2)}%</div>
                        <div style={{ fontSize: '7px', color: 'var(--text-dim)' }}>LOAD</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 8. OVERVIEW */}
            {activeTab === 'Overview' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>Overview — Fleet Telemetry</div>
                  <div className="dp-badges">
                    <span className="dp-badge green">{agentsList.filter(a => a.status === 'running').length} running</span>
                    <span className="dp-badge purple">{agentsList.length} agents</span>
                  </div>
                </div>
                <div className="dp-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                  {[
                    { val: agentsList.length, label: 'Agents' },
                    { val: '3', label: 'Workspaces' },
                    { val: '40+', label: 'API Endpoints' },
                    { val: '17', label: 'Dashboard Tabs' },
                  ].map(s => (
                    <div key={s.label} className="dp-stat premium-dp-stat" style={{ padding: '8px' }}>
                      <div className="dp-stat-val" style={{ fontSize: '18px' }}>{s.val}</div>
                      <div className="dp-stat-label" style={{ fontSize: '8px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Live Capture Form */}
                <form onSubmit={handleCaptureSubmit} style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  <input 
                    type="text" 
                    placeholder="Capture current thought/event (e.g. drafting sales copy)..."
                    value={captureNote}
                    onChange={(e) => setCaptureNote(e.target.value)}
                    style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px 8px', fontSize: '10px', color: '#fff', outline: 'none' }}
                  />
                  <button type="submit" className="dp-memory-trigger-btn">Capture</button>
                </form>

                <div className="dp-activity">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Recent Activity Feed</span>
                    <span className="dp-live-indicator"><span className="dp-live-dot" /> LIVE</span>
                  </div>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {logsList.map((a, i) => (
                      <div key={i} className={`dp-activity-item ${pulse && i === 0 ? 'dp-pulse' : ''}`} style={{ padding: '4px 8px', fontSize: '10px' }}>
                        <span>{a.icon}</span>
                        <span className="dp-activity-title" style={{ color: '#fff' }}>{a.title}</span>
                        <span className="dp-activity-time">{a.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 9. WORKSPACES */}
            {activeTab === 'Workspaces' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>Connected Repositories</div>
                </div>
                <div className="dp-workspaces-grid" style={{ gap: 8 }}>
                  {[
                    { name: 'prod-infra', agents: '2 active', SLA: '99.98%', hook: 'POST-COMMIT', usage: 68, color: 'var(--accent-blue)' },
                    { name: 'content-funnel', agents: '3 active', SLA: '99.50%', hook: 'POST-COMMIT', usage: 84, color: 'var(--accent-purple)' },
                    { name: 'dev-sandbox', agents: '1 active', SLA: '98.85%', hook: 'OFF', usage: 22, color: 'var(--accent-cyan)' },
                  ].map((ws, i) => {
                    const dynLoad = ws.usage + Math.floor(Math.sin(tickTime + i) * 6);
                    return (
                      <div key={ws.name} className="dp-workspace-card" style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#fff' }}>📦 {ws.name}</div>
                          <span style={{ fontSize: '8px', color: ws.color, fontWeight: '800', fontFamily: 'var(--font-mono)' }}>{ws.SLA} SLA</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-secondary)', marginBottom: 6 }}>
                          <span>{ws.agents}</span>
                          <span style={{ color: 'var(--text-dim)' }}>Hook: {ws.hook}</span>
                        </div>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${dynLoad}%`, background: `linear-gradient(90deg, ${ws.color}, var(--accent-pink))` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 10. KNOWLEDGE BRAIN */}
            {activeTab === 'Knowledge Brain' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>💡 Semantic Thought console</div>
                  <button className="dp-memory-trigger-btn" onClick={addManualMemory}>⚡ Inject Thought</button>
                </div>
                <div className="dp-brain-search-wrap" style={{ padding: '3px 8px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                  <span>🔍</span>
                  <input
                    type="text"
                    placeholder="Search formatted brain console..."
                    value={brainSearch}
                    onChange={(e) => { setBrainSearch(e.target.value); setUserInteracted(true); }}
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '10px', width: '100%' }}
                  />
                </div>
                <div className="dp-brain-console" style={{ height: '160px', overflowY: 'auto' }}>
                  {brainMemories
                    .filter(m => m.agent.includes(brainSearch) || m.decision.includes(brainSearch))
                    .map((mem, i) => (
                      <div key={i} className="dp-console-log-item" style={{ marginBottom: '4px' }}>
                        <div className="dp-cli-meta" style={{ fontSize: '9px', display: 'flex', gap: 6, marginBottom: 2 }}>
                          <span style={{ color: 'var(--accent-purple)', fontWeight: '700' }}>@{mem.agent}</span>
                          <span style={{ color: 'var(--accent-cyan)', background: 'rgba(0, 212, 255, 0.06)', padding: '1px 3px', borderRadius: 2 }}>{mem.action}</span>
                          <span style={{ color: 'var(--accent-green)', marginLeft: 'auto' }}>{(mem.confidence * 100).toFixed(0)}% conf</span>
                          <span style={{ color: 'var(--text-dim)' }}>{mem.time}</span>
                        </div>
                        <div style={{ fontSize: '9.5px', color: '#e8e8f0', fontFamily: 'var(--font-mono)' }}>
                          <span style={{ color: '#ff9f43' }}>"decision":</span> <span style={{ color: '#00e68a' }}>"{mem.decision}"</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 11. KNOWLEDGE GRAPH */}
            {activeTab === 'Knowledge Graph' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>🕸️ Force-Directed Fleet Topology</div>
                  <span className="dp-live-indicator"><span className="dp-live-dot" /> LIVE SVG FLOWS</span>
                </div>
                <div className="dp-graph-split" style={{ height: '220px', display: 'flex', gap: 12 }}>
                  <div className="dp-graph-canvas-wrap" style={{ flex: 1.3, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)', borderRadius: '6px', padding: 4 }}>
                    <svg viewBox="0 0 450 350" style={{ width: '100%', height: '100%' }}>
                      <defs>
                        <linearGradient id="g-purple" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#9b59ff"/><stop offset="100%" stopColor="#00d4ff"/></linearGradient>
                      </defs>
                      {[
                        { from: [80, 150], to: [320, 120] },
                        { from: [320, 120], to: [180, 220] },
                        { from: [180, 220], to: [360, 250] },
                        { from: [200, 40], to: [180, 220] },
                        { from: [80, 150], to: [180, 220] },
                        { from: [80, 300], to: [180, 220] },
                      ].map((line, i) => <line key={i} x1={line.from[0]} y1={line.from[1]} x2={line.to[0]} y2={line.to[1]} stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>)}
                      
                      <path id="pth-1" d="M 80 150 L 320 120" fill="none" />
                      <path id="pth-2" d="M 320 120 L 180 220" fill="none" />
                      <path id="pth-3" d="M 180 220 L 360 250" fill="none" />
                      
                      <circle r="3.5" fill="var(--accent-cyan)"><animateMotion dur="2.5s" repeatCount="indefinite"><mpath href="#pth-1" /></animateMotion></circle>
                      <circle r="3.5" fill="var(--accent-purple)"><animateMotion dur="3.0s" repeatCount="indefinite"><mpath href="#pth-2" /></animateMotion></circle>
                      <circle r="3.5" fill="var(--accent-green)"><animateMotion dur="2.0s" repeatCount="indefinite"><mpath href="#pth-3" /></animateMotion></circle>
                      
                      {[
                        { x: 200, y: 40, name: 'production-monitor', icon: '🖥️' },
                        { x: 80, y: 150, name: 'code-reviewer', icon: '🛡️' },
                        { x: 320, y: 120, name: 'content-writer', icon: '📝' },
                        { x: 180, y: 220, name: 'data-pipeline', icon: '🔌' },
                        { x: 360, y: 250, name: 'customer-support', icon: '💬' },
                        { x: 80, y: 300, name: 'lead-scorer', icon: '🎯' },
                      ].map((node) => {
                        const isSel = selectedGraphNode === node.name;
                        return (
                          <g key={node.name} transform={`translate(${node.x},${node.y})`} style={{ cursor: 'pointer' }} onClick={() => { setSelectedGraphNode(node.name); setUserInteracted(true); }}>
                            {isSel && <circle r="22" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5" strokeDasharray="3 3" style={{ animation: 'spin 12s linear infinite' }} />}
                            <circle r="16" fill="var(--bg-card)" stroke={isSel ? 'var(--accent-cyan)' : 'var(--border)'} strokeWidth="2"/>
                            <text textAnchor="middle" dy="4" fontSize="13">{node.icon}</text>
                            <text textAnchor="middle" y="-20" fontSize="8" fill={isSel ? '#fff' : 'var(--text-dim)'} fontFamily="var(--font-mono)">{node.name}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    {(() => {
                      const agent = agentsList.find(a => a.name === selectedGraphNode);
                      if (!agent) return <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Select node to audit.</div>;
                      return (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                          <div style={{ fontWeight: '700', fontSize: '11px', color: '#fff', fontFamily: 'var(--font-mono)' }}>🤖 {agent.name}</div>
                          <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '9px' }}><span style={{ color: 'var(--text-dim)' }}>ROLE:</span><span style={{ color: '#fff' }}>{agent.role}</span></div>
                          <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '9px' }}><span style={{ color: 'var(--text-dim)' }}>STATUS:</span><span style={{ color: 'var(--accent-green)', fontWeight: '700' }}>● {agent.status.toUpperCase()}</span></div>
                          <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '9px' }}><span style={{ color: 'var(--text-dim)' }}>SLA:</span><span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{agent.sla}</span></div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* 12. AGENT TRACES */}
            {activeTab === 'Agent Traces' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>🔍 execution latency traces</div>
                  <span className="dp-live-indicator"><span className="dp-live-dot" /> 124ms AVG</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { id: 'tr_9x1', type: 'POST', path: '/api/v1/observations', status: 200, latency: '1,240ms', tokens: '2.4k', spans: [{ name: 'auth', time: '5ms' }, { name: 'agent:production-monitor', time: '415ms' }, { name: 'llm:claude-3-5', time: '740ms' }] },
                    { id: 'tr_9x2', type: 'POST', path: '/api/v1/chat/stream', status: 200, latency: '2,800ms', tokens: '8.1k', spans: [{ name: 'auth', time: '4ms' }, { name: 'llm:claude-3-5', time: '2,650ms' }] }
                  ].map((trace, idx) => {
                    const isExp = expandedTrace === idx;
                    return (
                      <div key={trace.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div 
                          style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', padding: '8px 12px', cursor: 'pointer' }}
                          onClick={() => { setExpandedTrace(isExp ? null : idx); setUserInteracted(true); }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
                            <span style={{ color: '#00ff88', fontWeight: '700' }}>{trace.type}</span>
                            <span style={{ color: '#fff', fontWeight: '600' }}>{trace.path}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '10px', color: 'var(--text-secondary)' }}>
                            <span>⏱️ {trace.latency}</span>
                            <span>🔤 {trace.tokens}</span>
                            <span style={{ fontSize: '9px' }}>{isExp ? '▼' : '▶'}</span>
                          </div>
                        </div>
                        {isExp && (
                          <div style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {trace.spans.map((s, sIdx) => (
                              <div key={sIdx} style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', fontSize: '9px', fontFamily: 'var(--font-mono)' }}>
                                <span style={{ color: 'var(--accent-purple)' }}>└─ {s.name}</span>
                                <span style={{ color: 'var(--accent-cyan)' }}>{s.time}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 13. WORKFLOWS */}
            {activeTab === 'Workflows' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>🔗 Content Pipeline Automation</div>
                  <button className="dp-memory-trigger-btn" onClick={startWorkflowRun} disabled={workflowRunning}>
                    {workflowRunning ? '⚡ Running...' : '🚀 Trigger Run'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifycontent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px' }}>
                    <span style={{ fontWeight: '700', color: '#fff' }}>TikTok Bible Content Pipeline</span>
                    <span style={{ color: workflowRunning ? 'var(--accent-cyan)' : 'var(--accent-green)', fontWeight: '700' }}>{workflowRunning ? 'EXECUTING' : 'ACTIVE'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '4px 0', justifycontent: 'center' }}>
                    {['Webhook', 'Script', 'Audio', 'Video', 'FFmpeg', 'Publish'].map((s, i) => {
                      const active = workflowStep === (i + 1);
                      const passed = workflowStep > (i + 1);
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ padding: '4px 6px', borderRadius: '4px', fontSize: '9px', background: active ? 'rgba(0,212,255,0.1)' : passed ? 'rgba(0,230,138,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${active ? 'var(--accent-cyan)' : passed ? 'var(--accent-green)' : 'var(--border)'}`, color: active ? '#fff' : 'var(--text-secondary)', textAlign: 'center', minWidth: '46px' }}>
                            {s}
                          </div>
                          {i < 5 && <span style={{ color: passed ? 'var(--accent-green)' : 'var(--text-dim)', fontSize: '8px' }}>→</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding: '6px 10px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '9px', height: '80px', overflowY: 'auto' }}>
                    {workflowLogs.map((log, lIdx) => <div key={lIdx} style={{ color: log.startsWith('[System]') ? 'var(--accent-purple)' : log.includes('Complete') ? 'var(--accent-green)' : 'var(--text-secondary)' }}>{log}</div>)}
                  </div>
                </div>
              </div>
            )}

            {/* 14. MEMORY */}
            {activeTab === 'Memory' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>🧬 3-Tier Memory consolidation</div>
                  <button className="dp-memory-trigger-btn" onClick={consolidateMemories} disabled={memoryConsolidating}>
                    {memoryConsolidating ? 'Consolidating...' : '🧬 Consolidate'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, height: '180px', overflowY: 'auto' }}>
                  {memoriesList.map((mem) => (
                    <div key={mem.id} style={{ display: 'flex', gap: 8, padding: '6px 8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '10px', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', color: mem.type === 'semantic' ? 'var(--accent-purple)' : 'var(--accent-cyan)', background: mem.type === 'semantic' ? 'rgba(155,89,255,0.04)' : 'rgba(0,212,255,0.04)', padding: '2px 4px', borderRadius: '3px', fontSize: '9px' }}>{mem.id}</span>
                      <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{mem.content}</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '9px' }}>{mem.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 15. COMPLIANCE */}
            {activeTab === 'Compliance' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>🛡️ Cryptographic SIEM Audit Ledger</div>
                  <button className="dp-memory-trigger-btn" onClick={verifyComplianceLogs} disabled={complianceAuditing}>
                    {complianceAuditing ? '🔒 Auditing...' : '🔒 Audit logs'}
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '4px' }}>Timestamp</th>
                      <th style={{ padding: '4px' }}>Agent</th>
                      <th style={{ padding: '4px' }}>Payload Hash Signature</th>
                      <th style={{ padding: '4px', textAlign: 'right' }}>Audit Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { time: '10:24:12 AM', agent: 'lead-scorer', hash: '5f9a2d8b4e1c7a6f9c8d5b4a...' },
                      { time: '10:23:45 AM', agent: 'code-reviewer', hash: '8c9d4e5f6a7b8c9d0a1b2c3d...' },
                    ].map((row, rIdx) => (
                      <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '6px 4px', color: 'var(--text-dim)' }}>{row.time}</td>
                        <td style={{ padding: '6px 4px', fontWeight: '600', color: '#fff' }}>{row.agent}</td>
                        <td style={{ padding: '6px 4px', color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)' }}>{row.hash}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: '700' }}>
                          {complianceAuditing ? <span style={{ color: 'var(--accent-cyan)' }}>⏳ auditing</span> : complianceAuditVerified ? <span style={{ color: 'var(--accent-green)' }}>✅ VERIFIED</span> : <span style={{ color: 'var(--accent-orange)' }}>● SECURE</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 16. TEAM HQ */}
            {activeTab === 'Team HQ' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>🏢 Team HQ — Collaboration Panel</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 6, fontWeight: '700' }}>Fleet Invite</div>
                    <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input 
                        type="email" 
                        placeholder="Invite email address..." 
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '5px 8px', fontSize: '10px', color: '#fff', outline: 'none' }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <select 
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px', color: '#fff', padding: '5px', fontSize: '9px', outline: 'none' }}
                        >
                          <option>Developer</option>
                          <option>Admin</option>
                          <option>Auditor</option>
                        </select>
                        <button type="submit" className="dp-memory-trigger-btn" style={{ padding: '5px 12px' }}>Send Invite</button>
                      </div>
                    </form>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 6, fontWeight: '700' }}>Active Members</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '120px', overflowY: 'auto' }}>
                      {teamMembers.map((member, mIdx) => (
                        <div key={mIdx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '9.5px', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: '700', color: '#fff' }}>{member.name}</div>
                            <div style={{ fontSize: '8px', color: 'var(--text-dim)' }}>{member.email}</div>
                          </div>
                          <span style={{ fontSize: '8px', padding: '1px 4px', borderRadius: '3px', background: 'rgba(155,89,255,0.1)', color: 'var(--accent-purple)', fontWeight: '600' }}>
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 17. SETTINGS */}
            {activeTab === 'Settings' && (
              <div className="dp-tab-fade">
                <div className="dp-header" style={{ marginBottom: '12px' }}>
                  <div className="dp-title" style={{ fontSize: '14px' }}>⚙️ Global Fleet Settings</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', marginBottom: 6, color: '#fff' }}>Telemetry API Key</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input 
                        type="text" 
                        readOnly 
                        value={keyGenLoading ? 'Generating sk_live...' : generatedKey || 'Click generate key below...'} 
                        style={{ fontSize: '9.5px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', padding: '5px 8px', borderRadius: '4px', flex: 1, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', outline: 'none' }} 
                      />
                      {generatedKey ? (
                        <button className="dp-memory-trigger-btn" onClick={copyKeyToClipboard}>{copiedKey ? '✅ Copied' : 'Copy Key'}</button>
                      ) : (
                        <button className="dp-memory-trigger-btn" onClick={handleGenerateKey} disabled={keyGenLoading}>{keyGenLoading ? '...' : 'Generate'}</button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '8px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Claude API integration</div>
                      <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--accent-green)', marginTop: 2 }}>🔒 ACTIVE BYOK SECURE</div>
                    </div>
                    <div style={{ padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '8px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>License Tier</div>
                      <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--accent-purple)', marginTop: 2 }}>✨ ENTERPRISE LICENSE</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   INTERACTIVE CODE PLAYGROUND
   ═══════════════════════════════════════════ */
function InteractiveCodePlayground() {
  const [lang, setLang] = useState('python');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const sequence = [
      { t: 500, log: '{"level":"info","msg":"Initializing AgentOS client...","timestamp":"2026-05-30T10:00:00Z"}' },
      { t: 1200, log: '{"level":"info","msg":"Connected to workspace: my-saas-backend","workspace_id":"ws_7x9q"}' },
      { t: 2500, log: '{"level":"debug","msg":"Agent run wrapped","agent":"invoice-processor","run_id":"run_abc123"}' },
      { t: 3800, log: '{"level":"info","msg":"Telemetry synced to dashboard. Latency: 12ms.","status":"success"}' },
    ];
    let timeouts = [];
    const runSequence = () => {
      setLogs([]);
      sequence.forEach((item) => {
        timeouts.push(setTimeout(() => {
          setLogs(prev => [...prev, item.log]);
        }, item.t));
      });
    };
    runSequence();
    const interval = setInterval(runSequence, 6000);
    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, []);

  const pythonCode = `import stoicos

os = stoicos.Client(
    api_key="sk_live_xxx",
    workspace="my-saas-backend"
)

@os.wrap_agent(name="invoice-processor")
def process_invoice(file_path):
    result = extract_data(file_path)
    return result

# Telemetry is auto-captured in background`;

  const nodeCode = `import { AgentOS } from 'stoic-agentos-sdk';

const os = new AgentOS({
  apiKey: 'sk_live_xxx',
  workspace: 'my-saas-backend',
});

const invoiceAgent = os.wrapAgent(
  'invoice-processor', 
  async (input) => {
    return await processInvoice(input);
  }
);`;

  return (
    <div className="playground-container">
      <div className="playground-tabs">
        <button className={lang === 'python' ? 'active' : ''} onClick={() => setLang('python')}>Python SDK</button>
        <button className={lang === 'node' ? 'active' : ''} onClick={() => setLang('node')}>Node.js SDK</button>
      </div>
      <div className="playground-split">
        <div className="playground-editor">
          <pre><code>{lang === 'python' ? pythonCode : nodeCode}</code></pre>
        </div>
        <div className="playground-terminal">
          <div className="term-header">Terminal — Live Traces</div>
          <div className="term-body">
            {logs.map((l, i) => {
              // Parse quoted strings into React elements instead of using dangerouslySetInnerHTML
              const parts = l.split(/(".*?")/g);
              return (
                <div key={i} className="term-line">
                  {parts.map((part, j) =>
                    part.startsWith('"') && part.endsWith('"')
                      ? <span key={j} className="str">{part}</span>
                      : part
                  )}
                </div>
              );
            })}
            <div className="term-cursor"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Section refs for scroll reveal
  const infraRef = useScrollReveal();
  const metricsRef = useScrollReveal();
  const socialRef = useScrollReveal();
  const consolidationRef = useScrollReveal();
  const featuresRef = useScrollReveal();
  const previewRef = useScrollReveal();
  const sdkRef = useScrollReveal();
  const compareRef = useScrollReveal();
  const ecoRef = useScrollReveal();
  const testimonialsRef = useScrollReveal();
  const pricingRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  useEffect(() => {
    document.title = 'Stoic AgentOS — AI Agent Memory & Intelligence Platform';
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Mobile detection for performance optimization
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on navigation
  const handleMobileNav = (target) => {
    setMobileMenuOpen(false);
    if (target.startsWith('/')) {
      navigate(target);
    } else {
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing">
      {/* ── NAV ── */}
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
            <div className="nav-logo-icon">⚡</div>
            <span>Stoic <span style={{ color: 'var(--accent-purple)' }}>AgentOS</span></span>
          </div>
          <button
            className="nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
          <div className={`nav-links${mobileMenuOpen ? ' mobile-open' : ''}`}>
            {NAV_LINKS.map(l => l === 'Docs'
              ? <Link key={l} className="nav-link" to="/docs" onClick={() => setMobileMenuOpen(false)}>{l}</Link>
              : <a key={l} className="nav-link" href={`#${l.toLowerCase()}`} onClick={(e) => { if (isMobile) { e.preventDefault(); handleMobileNav(l.toLowerCase()); } }}>{l}</a>
            )}
            <a
              href="https://github.com/benjaminkernbaum-ux/stoic-agentos"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#ffb900', fontWeight: 600 }}
            >
              ⭐ Star on GitHub
            </a>
            <Link className="nav-link" to="/login" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
            <button className="btn btn-primary btn-sm" onClick={() => { setMobileMenuOpen(false); navigate('/signup'); }}>Get Started Free</button>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════
           HERO — Neural Network Canvas
         ══════════════════════════════════ */}
      <section className="hero">
        <NeuralHeroCanvas />
        <div className="container">
          <div className="hero-badge animate-in">
            <span className="hero-badge-dot" />
            $11.6B market · Backed by real production use
          </div>
          <h1 className="animate-in delay-1">
            Give Your AI Agents a<br />
            <span className="gradient-text">Persistent Brain</span>
          </h1>
          <p className="hero-sub animate-in delay-2">
            Three-tier memory, knowledge persistence, reflection engine, and compliance audit — 
            the cognitive layer your AI agent fleet is missing. Open-source. Self-hostable.
          </p>
          <div className="hero-cta animate-in delay-3">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/signup')}>
              🚀 Start Free — No Credit Card
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' })}>
              See It Live →
            </button>
          </div>
          <div className="hero-metrics animate-in delay-4">
            <div className="hero-metric">
              <div className="hero-metric-value" style={{ color: 'var(--accent-purple)' }}>21,683</div>
              <div className="hero-metric-label">Lines of Code</div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-value" style={{ color: 'var(--accent-cyan)' }}>40+</div>
              <div className="hero-metric-label">API Endpoints</div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-value" style={{ color: 'var(--accent-green)' }}>12</div>
              <div className="hero-metric-label">Dashboard Tabs</div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-value" style={{ color: 'var(--accent-orange)' }}>MIT</div>
              <div className="hero-metric-label">Open Source</div>
            </div>
          </div>
        </div>
        {/* Scroll indicator */}
        <div className="scroll-indicator">
          <span>Scroll to explore</span>
          <svg viewBox="0 0 24 24"><polyline points="7 13 12 18 17 13" /><polyline points="7 6 12 11 17 6" /></svg>
        </div>
      </section>

      {/* ══════════════════════════════════
           SOCIAL PROOF — Logo Bar
         ══════════════════════════════════ */}
      <section className="section social-proof-section" ref={socialRef} style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="container section-center">
          <div className="social-proof-label section-reveal">Built With</div>
          <div className="logo-bar section-reveal" style={{ transitionDelay: '0.1s' }}>
            {LOGOS.map(logo => (
              <div key={logo.name} className="logo-item">
                <span className="logo-icon">{logo.icon}</span>
                <span className="logo-text">{logo.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
           MARKET CONSOLIDATION — Competitive Moat
         ══════════════════════════════════ */}
      <section className="section" ref={consolidationRef}>
        <div className="container section-reveal">
          <MarketConsolidation />
        </div>
      </section>

      {/* ══════════════════════════════════
           INFRASTRUCTURE SIMULATION
         ══════════════════════════════════ */}
      <section className="section" style={{ paddingTop: 0 }} ref={infraRef}>
        <div className="container-wide section-reveal">
          <InfraSimulation />
        </div>
      </section>

      {/* ══════════════════════════════════
           PERFORMANCE METRICS — Animated Counters
         ══════════════════════════════════ */}
      <section className="section metrics-section" ref={metricsRef}>
        <ParticleMesh particleCount={isMobile ? 12 : 30} color="#00f0ff" speed={0.15} connectionDistance={isMobile ? 60 : 100} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-center section-reveal">
            <div className="section-label">⚡ RAW POWER</div>
            <h2 className="section-title">Built for Production Scale</h2>
            <p className="section-sub">Numbers that speak for themselves.</p>
          </div>
          <div className="metrics-grid section-reveal" style={{ transitionDelay: '0.2s' }}>
            <AnimatedCounter end={26} suffix="" color="#00f0ff" label="Production Agents" />
            <AnimatedCounter end={40} prefix="" suffix="+" color="#00ff88" label="API Endpoints" />
            <AnimatedCounter end={21683} suffix="" color="#ff00aa" label="Lines of Code" />
            <AnimatedCounter end={12} suffix="" color="#ffaa00" label="Dashboard Tabs" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
           LIVE DASHBOARD PREVIEW
         ══════════════════════════════════ */}
      <section className="section" id="preview" style={{ background: 'var(--bg-deep)' }} ref={previewRef}>
        <div className="container section-center">
          <div className="section-label section-reveal">👁️ LIVE PREVIEW</div>
          <h2 className="section-title section-reveal">See your command center in action</h2>
          <p className="section-sub section-reveal">
            Real-time agent monitoring, observation feeds, and fleet metrics — all in one premium dashboard.
          </p>
          <div className="section-reveal" style={{ transitionDelay: '0.2s' }}>
            <LiveDashboardPreview />
          </div>
          <div className="section-reveal" style={{ transitionDelay: '0.3s', marginTop: 32 }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/signup')}>
              🚀 Get Your Own Dashboard — Free
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
           FEATURES
         ══════════════════════════════════ */}
      <section className="section" id="features" ref={featuresRef}>
        <div className="container section-center">
          <div className="section-label section-reveal">⚡ CAPABILITIES</div>
          <h2 className="section-title section-reveal">Everything your AI fleet needs</h2>
          <p className="section-sub section-reveal">
            One platform to monitor agents, persist knowledge, manage workspaces, and automate operations across your entire stack.
          </p>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card section-reveal" style={{ transitionDelay: `${i * 0.08}s` }}>
                <div className="feature-icon" style={{ background: f.color }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="section-label section-reveal" style={{ marginTop: 80 }}>🛡️ ENTERPRISE GOVERNANCE</div>
          <h2 className="section-title section-reveal">Built for Mission-Critical Scale</h2>
          <div className="features-grid tech-grid section-reveal" style={{ transitionDelay: '0.2s', marginTop: 32 }}>
            {TECH_FEATURES.map((f, i) => (
              <div key={i} className="feature-card tech-card">
                <div className="feature-icon" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
           HOW IT WORKS — 3 Steps
         ══════════════════════════════════ */}
      <section className="section" style={{ background: 'var(--bg-deep)' }}>
        <div className="container section-center">
          <div className="section-label section-reveal">🛠️ GET STARTED</div>
          <h2 className="section-title section-reveal">Up and running in 3 minutes</h2>
          <p className="section-sub section-reveal">No complex setup. No infrastructure to manage.</p>
          <div className="how-it-works-grid section-reveal" style={{ transitionDelay: '0.2s' }}>
            <div className="how-step">
              <div className="how-step-number">1</div>
              <div className="how-step-icon">📦</div>
              <h3>Install the SDK</h3>
              <code style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: 6, background: 'rgba(155,89,255,0.1)', border: '1px solid rgba(155,89,255,0.2)', color: '#d4a5ff' }}>npm install stoic-agentos-sdk</code>
              <p>One dependency. Works with any JavaScript/TypeScript agent framework.</p>
            </div>
            <div className="how-step-arrow section-reveal" style={{ transitionDelay: '0.3s' }}>→</div>
            <div className="how-step">
              <div className="how-step-number">2</div>
              <div className="how-step-icon">🔌</div>
              <h3>Wrap Your Agents</h3>
              <code style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: 6, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#80e8ff' }}>os.wrapAgent('my-agent', fn)</code>
              <p>3 lines of code. Auto-captures runs, errors, decisions, and heartbeats.</p>
            </div>
            <div className="how-step-arrow section-reveal" style={{ transitionDelay: '0.4s' }}>→</div>
            <div className="how-step">
              <div className="how-step-number">3</div>
              <div className="how-step-icon">🎯</div>
              <h3>See Everything</h3>
              <code style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: 6, background: 'rgba(0,230,138,0.1)', border: '1px solid rgba(0,230,138,0.2)', color: '#80ffbb' }}>stoicagentos.com/dashboard</code>
              <p>Real-time fleet monitoring, AI-powered insights, and knowledge persistence — live.</p>
            </div>
          </div>
          <div className="section-reveal" style={{ transitionDelay: '0.5s', marginTop: 40, textAlign: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/signup')}>🚀 Start Free — No Credit Card</button>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE PLAYGROUND ── */}
      <section className="section" id="sdk" style={{ background: 'var(--bg-deep)' }} ref={sdkRef}>
        <div className="container">
          <div className="section-center section-reveal" style={{ marginBottom: 40 }}>
            <div className="section-label">🔧 DEVELOPER EXPERIENCE</div>
            <h2 className="section-title">One SDK. Zero Configuration.</h2>
            <p className="section-sub">
              Drop the SDK into your codebase. Telemetry, latency, and agent decisions are instantly routed to your Command Center.
            </p>
          </div>
          <div className="section-reveal" style={{ transitionDelay: '0.2s' }}>
            <InteractiveCodePlayground />
          </div>
          <div className="section-reveal" style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, transitionDelay: '0.3s' }}>
            <div className="social-badge" onClick={() => navigator.clipboard?.writeText('npm install stoic-agentos-sdk')} style={{ cursor: 'pointer' }}>📦 npm install stoic-agentos-sdk</div>
            <div className="social-badge" onClick={() => navigator.clipboard?.writeText('pip install stoicos')} style={{ cursor: 'pointer' }}>🐍 pip install stoicos</div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="section" id="compare" ref={compareRef}>
        <div className="container section-center">
          <div className="section-label section-reveal">📊 COMPARISON</div>
          <h2 className="section-title section-reveal">Why teams choose AgentOS</h2>
          <p className="section-sub section-reveal">We&apos;re the only platform combining agent monitoring + knowledge persistence + workspace management in one dashboard.</p>
          <div className="compare-table-wrap section-reveal" style={{ transitionDelay: '0.2s' }}>
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="us">⚡ AgentOS</th>
                  <th>LangSmith</th>
                  <th>Langfuse</th>
                  <th>Braintrust</th>
                  <th>AgentOps</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row, i) => (
                  <tr key={i}>
                    <td>{row.feature}</td>
                    <td className="us">{row.us}</td>
                    <td>{row.langsmith}</td>
                    <td>{row.langfuse}</td>
                    <td>{row.braintrust}</td>
                    <td>{row.agentops}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
           TESTIMONIALS
         ══════════════════════════════════ */}
      <section className="section" style={{ background: 'var(--bg-deep)' }} ref={testimonialsRef}>
        <div className="container section-center">
          <div className="section-label section-reveal">🧭 WHY I BUILT THIS</div>
          <h2 className="section-title section-reveal">From 26 agents with zero visibility to a command center</h2>
          <p className="section-sub section-reveal">
            Built by a founder who runs AI agents in production every day.
          </p>
          <div className="testimonials-grid section-reveal" style={{ transitionDelay: '0.2s' }}>
            {FOUNDER_STORY.map((s, i) => (
              <div key={i} className="testimonial-card" style={{ borderTop: `3px solid ${s.color}` }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>{s.icon}</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, opacity: 0.8 }}>{s.text}</p>
              </div>
            ))}
          </div>
          {/* Beta CTA */}
          <div className="section-reveal" style={{ transitionDelay: '0.4s', marginTop: 40, textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '14px 28px', borderRadius: 12, background: 'rgba(155,89,255,0.1)', border: '1px solid rgba(155,89,255,0.3)' }}>
              <span style={{ fontSize: '1.4rem' }}>🎯</span>
              <span style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)' }}>
                <strong>Early access open</strong> — Join the beta and get lifetime Pro access
              </span>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/signup')} style={{ marginLeft: 8 }}>Join Beta</button>
            </div>
          </div>
        </div>
      </section>



      {/* ── PRICING ── */}
      <section className="section" id="pricing" style={{ background: 'var(--bg-deep)' }} ref={pricingRef}>
        <div className="container section-center">
          <div className="section-label section-reveal">💎 PRICING</div>
          <h2 className="section-title section-reveal">Start free. Scale when ready.</h2>
          <p className="section-sub section-reveal">No credit card required. Upgrade as your agent fleet grows.</p>
          <div className="section-reveal" style={{ transitionDelay: '0.1s', marginBottom: 48 }}>
            <PricingCalculator />
          </div>
          <div className="pricing-grid section-reveal" style={{ transitionDelay: '0.2s' }}>
            {PRICING.map((p, i) => (
              <div key={i} className={`pricing-card ${p.style}`}>
                <div className="pricing-name">{p.name}</div>
                <div className="pricing-desc">{p.desc}</div>
                <div className="pricing-price">
                  <span className="pricing-amount">{p.price}</span>
                  <span className="pricing-period">{p.period}</span>
                </div>
                <ul className="pricing-features">
                  {p.features.map((f, j) => <li key={j}>{f}</li>)}
                  {p.disabled.map((f, j) => <li key={`d-${j}`} className="disabled">{f}</li>)}
                </ul>
                <button
                  className={`btn ${p.style === 'featured' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    if (p.name === 'Enterprise') {
                      window.location.href = 'mailto:benjamin@stoicagentos.com?subject=AgentOS Enterprise Inquiry';
                    } else {
                      navigate('/signup');
                    }
                  }}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
          {/* Urgency badge */}
          <div className="pricing-urgency section-reveal" style={{ transitionDelay: '0.4s' }}>
            <span className="pricing-urgency-dot" />
            <span>Start free today — upgrade anytime, cancel anytime. No contracts.</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
           CTA — with Particle Background
         ══════════════════════════════════ */}
      <section className="section section-center section-particles" style={{ paddingBottom: 120 }} ref={ctaRef}>
        <ParticleMesh particleCount={isMobile ? 14 : 35} color="#00ff88" speed={0.25} connectionDistance={isMobile ? 65 : 110} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <h2 className="section-title section-reveal">Ready to command your AI fleet?</h2>
          <p className="section-sub section-reveal" style={{ margin: '0 auto 32px', transitionDelay: '0.1s' }}>
            Join the first wave of teams using AgentOS to give their AI agents persistent memory, intelligence, and compliance controls.
          </p>
          <div className="hero-cta section-reveal" style={{ transitionDelay: '0.2s' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/signup')}>🚀 Get Started Free</button>
            <button className="btn btn-secondary btn-lg" onClick={() => window.location.href = 'mailto:benjamin@stoicagentos.com?subject=AgentOS Demo Request'}>📅 Book a Demo</button>
          </div>
          <div className="cta-trust section-reveal" style={{ transitionDelay: '0.3s' }}>
            <span>✓ No credit card required</span>
            <span>✓ 14-day Pro trial</span>
            <span>✓ Cancel anytime</span>
          </div>
          <div className="section-reveal" style={{ transitionDelay: '0.4s', marginTop: 48 }}>
            <WaitlistCapture />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <h3>⚡ Stoic AgentOS</h3>
              <p>The operating system for AI agent fleets. Monitor, orchestrate, and scale with confidence.</p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#sdk">SDK</a>
              <Link to="/docs">Documentation</Link>
              <Link to="/changelog">Changelog</Link>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <Link to="/about">About</Link>
              <Link to="/blog">Blog</Link>
              <a href="https://github.com/benjaminkernbaum-ux" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://www.linkedin.com/company/17224756/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/security">Security</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Stoic AgentOS. All rights reserved.</span>
            <span>Built with ⚡ by Benjamin Kernbaum</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
