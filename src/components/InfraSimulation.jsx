import { useState, useEffect, useRef } from 'react';
import './InfraSimulation.css';

// ── Service definitions ──
const SERVICES = [
  { id: 'api', name: 'agent-api', icon: '⚡', iconBg: 'rgba(155,89,255,0.15)', status: 'Live', statusColor: '#00e68a', x: '50%', y: '28%', badge: '6 endpoints' },
  { id: 'supabase', name: 'supabase-db', icon: '🗄', iconBg: 'rgba(0,212,255,0.12)', status: '14 tables', statusColor: '#00d4ff', x: '18%', y: '55%', badge: 'pg-data' },
  { id: 'n8n', name: 'n8n-workflows', icon: '⚙️', iconBg: 'rgba(255,159,67,0.12)', status: '23 flows', statusColor: '#ff9f43', x: '78%', y: '55%', badge: 'Docker' },
  { id: 'stripe', name: 'stripe-billing', icon: '💳', iconBg: 'rgba(107,99,255,0.12)', status: 'Live', statusColor: '#00e68a', x: '30%', y: '80%', badge: '$49/mo' },
  { id: 'vercel', name: 'vercel-frontend', icon: '▲', iconBg: 'rgba(255,255,255,0.08)', status: 'Production', statusColor: '#00e68a', x: '68%', y: '80%', badge: 'React' },
];

const CONNECTIONS = [
  ['api', 'supabase'], ['api', 'n8n'], ['api', 'stripe'],
  ['api', 'vercel'], ['supabase', 'stripe'], ['vercel', 'n8n'],
];

// ── Agent fleet data ──
const AGENTS = [
  { name: 'MERCURY', type: 'Outreach', status: 'live', load: 87 },
  { name: 'HERMES', type: 'CRM Sync', status: 'live', load: 72 },
  { name: 'AUTO', type: 'Auto-Reply', status: 'live', load: 65 },
  { name: 'WIRE', type: 'Transfer', status: 'live', load: 91 },
  { name: 'STOICBOT', type: 'Content', status: 'live', load: 58 },
  { name: 'FINCFO', type: 'Finance', status: 'live', load: 44 },
  { name: 'LEDGER', type: 'Bookkeep', status: 'live', load: 33 },
  { name: 'SCRAPE', type: 'Data', status: 'deploying', load: 0 },
  { name: 'ADGEN', type: 'Ads', status: 'live', load: 76 },
  { name: 'REPLY', type: 'Email', status: 'live', load: 52 },
  { name: 'TAXBOT', type: 'Tax', status: 'idle', load: 12 },
  { name: 'RECON', type: 'Reconcile', status: 'live', load: 68 },
  { name: 'APOLLO', type: 'Prospect', status: 'live', load: 81 },
  { name: 'INVOICER', type: 'Billing', status: 'deploying', load: 0 },
  { name: 'SENTINEL', type: 'Monitor', status: 'live', load: 95 },
  { name: 'CURATOR', type: 'Knowledge', status: 'live', load: 40 },
];

// ── Metric chart generator ──
function generatePoints(count, min, max, variance) {
  const pts = [];
  let val = min + Math.random() * (max - min);
  for (let i = 0; i < count; i++) {
    val += (Math.random() - 0.48) * variance;
    val = Math.max(min, Math.min(max, val));
    pts.push(val);
  }
  return pts;
}

function SparkLine({ data, color, width = '100%', height = '100%' }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');
  const fillPts = `0,100 ${pts} 100,100`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" width={width} height={height}>
      <defs><linearGradient id={`g-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <polygon points={fillPts} fill={`url(#g-${color.replace('#','')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ── Views ──

function ArchitectureView() {
  const canvasRef = useRef(null);
  const [nodePositions, setNodePositions] = useState({});

  useEffect(() => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const pos = {};
    SERVICES.forEach(s => {
      pos[s.id] = {
        x: (parseFloat(s.x) / 100) * rect.width,
        y: (parseFloat(s.y) / 100) * rect.height,
      };
    });
    setNodePositions(pos);
  }, []);

  return (
    <div className="infra-canvas" ref={canvasRef}>
      <svg className="infra-lines">
        {Object.keys(nodePositions).length > 0 && CONNECTIONS.map(([a, b], i) => (
          <line key={i}
            x1={nodePositions[a]?.x} y1={nodePositions[a]?.y}
            x2={nodePositions[b]?.x} y2={nodePositions[b]?.y}
          />
        ))}
      </svg>
      {SERVICES.map((s, i) => (
        <div key={s.id} className="infra-node"
          style={{ left: s.x, top: s.y, transform: 'translate(-50%,-50%)', animationDelay: `${i * 0.1}s` }}>
          <div className="infra-node-header">
            <div className="infra-node-icon" style={{ background: s.iconBg }}>{s.icon}</div>
            <div className="infra-node-name">{s.name}</div>
          </div>
          <div className="infra-node-status">
            <span className="dot" style={{ background: s.statusColor }} />
            <span style={{ color: s.statusColor }}>{s.status}</span>
          </div>
          <div className="infra-node-badge" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}>
            📦 {s.badge}
          </div>
        </div>
      ))}
      <div className="infra-alert">
        <div className="infra-alert-title" style={{ color: '#00e68a' }}>✅ All Systems Operational</div>
        <div className="infra-alert-body">5 services connected · 0 errors · 99.9% uptime</div>
        <div className="infra-alert-chart">
          <SparkLine data={generatePoints(30, 10, 90, 15)} color="#00e68a" />
        </div>
      </div>
    </div>
  );
}

function FleetView() {
  const statusColors = { live: '#00e68a', deploying: '#ff9f43', idle: '#555570' };
  const barColors = { live: '#4d7cff', deploying: '#ff9f43', idle: '#2a2a3e' };
  return (
    <div className="infra-fleet">
      {AGENTS.map((a, i) => (
        <div key={i} className="infra-agent-card" style={{ animationDelay: `${i * 0.03}s` }}>
          <div className="infra-agent-card-header">
            <span className="infra-agent-name">{a.name}</span>
            <span className="infra-agent-dot" style={{ background: statusColors[a.status] }} />
          </div>
          <div className="infra-agent-type">{a.type}</div>
          <div className="infra-agent-bar">
            <div className="infra-agent-bar-fill" style={{ width: `${a.load}%`, background: barColors[a.status] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ScaleView() {
  const [replicas, setReplicas] = useState(1);
  const options = [1, 2, 3, 5, 10];
  return (
    <div className="infra-scale">
      <div className="infra-scale-node">
        <div className="infra-scale-node-name">⚡ agent-api</div>
        <div className="infra-scale-warning">⚠️ High Agent Load</div>
        <div style={{ marginTop: 12 }}>
          <SparkLine data={generatePoints(20, 60, 100, 8)} color="#ff9f43" width="160" height="40" />
        </div>
      </div>
      <div className="infra-scale-panel">
        <div className="infra-scale-label">agent-api › Replicas</div>
        {options.map(n => (
          <div key={n} className={`infra-scale-option ${replicas === n ? 'active' : ''}`}
            onClick={() => setReplicas(n)}>
            <span>{n} Replica{n > 1 ? 's' : ''}</span>
            {replicas === n && <span className="infra-scale-confirm">Current</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonitorView() {
  const [metrics] = useState(() => [
    { title: 'Memory Usage', value: '1.2 GB', color: '#9b59ff', data: generatePoints(40, 20, 80, 8) },
    { title: 'Request Latency', value: '142ms', color: '#ff6b9d', data: generatePoints(40, 50, 200, 25) },
    { title: 'CPU Usage', value: '0.4x', color: '#00e68a', data: generatePoints(40, 10, 60, 10) },
    { title: 'Disk Usage', value: '12 GB', color: '#00d4ff', data: generatePoints(40, 30, 50, 3) },
    { title: 'Network Egress', value: '28 MB', color: '#4d7cff', data: generatePoints(40, 5, 45, 8) },
    { title: 'Observations', value: '1.2K/min', color: '#ff9f43', data: generatePoints(40, 20, 90, 12) },
  ]);
  return (
    <div className="infra-monitor">
      {metrics.map((m, i) => (
        <div key={i} className="infra-metric-card">
          <div className="infra-metric-header">
            <span className="infra-metric-title">{m.title}</span>
            <span className="infra-metric-value" style={{ color: m.color }}>{m.value}</span>
          </div>
          <div className="infra-metric-chart">
            <SparkLine data={m.data} color={m.color} />
          </div>
        </div>
      ))}
    </div>
  );
}

function KnowledgeView() {
  const nodes = [
    { label: '🧠 Knowledge Brain', x: '50%', y: '45%', center: true },
    { label: 'Supabase Schema', x: '20%', y: '22%' },
    { label: 'Agent Registry', x: '75%', y: '18%' },
    { label: 'Deployment Map', x: '15%', y: '65%' },
    { label: 'API Contracts', x: '82%', y: '60%' },
    { label: 'Git Hooks', x: '38%', y: '78%' },
    { label: 'Auth Patterns', x: '65%', y: '80%' },
    { label: 'Workspace Map', x: '30%', y: '35%' },
    { label: 'Financial Dept', x: '72%', y: '38%' },
  ];
  const lines = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8]];

  return (
    <div className="infra-knowledge">
      <svg className="infra-lines" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}>
        {lines.map(([a, b], i) => (
          <line key={i}
            x1={nodes[a].x} y1={nodes[a].y}
            x2={nodes[b].x} y2={nodes[b].y}
            stroke="rgba(155,89,255,0.15)" strokeWidth="1"
            strokeDasharray="4 3"
          />
        ))}
      </svg>
      {nodes.map((n, i) => (
        <div key={i} className={`infra-k-node ${n.center ? 'center' : ''}`}
          style={{ left: n.x, top: n.y, transform: 'translate(-50%,-50%)' }}>
          {n.label}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──

const TABS = [
  { id: 'arch', icon: '🔗', label: 'Architecture' },
  { id: 'fleet', icon: '🤖', label: 'Fleet' },
  { id: 'scale', icon: '📊', label: 'Scale' },
  { id: 'monitor', icon: '📈', label: 'Monitor' },
  { id: 'knowledge', icon: '🧠', label: 'Knowledge' },
];

export default function InfraSimulation() {
  const [activeTab, setActiveTab] = useState('arch');

  const views = {
    arch: <ArchitectureView />,
    fleet: <FleetView />,
    scale: <ScaleView />,
    monitor: <MonitorView />,
    knowledge: <KnowledgeView />,
  };

  return (
    <div className="infra-sim">
      {views[activeTab]}
      <div className="infra-tabs">
        {TABS.map(t => (
          <button key={t.id}
            className={`infra-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            <span className="infra-tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
