import { useState, useEffect, useRef, useMemo } from 'react';
import './InfraSimulation.css';

/* ═══════════════════════════════════════════
   DATA & HELPERS
   ═══════════════════════════════════════════ */

const SERVICES = [
  { id: 'api', name: 'agent-api', icon: '⚡', iconBg: 'rgba(155,89,255,0.15)', status: 'Live', statusColor: '#00e68a', x: '50%', y: '28%', badge: '6 endpoints' },
  { id: 'supabase', name: 'supabase-db', icon: '🗄', iconBg: 'rgba(0,212,255,0.12)', status: '14 tables', statusColor: '#00d4ff', x: '18%', y: '55%', badge: 'pg-data' },
  { id: 'n8n', name: 'n8n-workflows', icon: '⚙️', iconBg: 'rgba(255,159,67,0.12)', status: '23 flows', statusColor: '#ff9f43', x: '78%', y: '55%', badge: 'Docker' },
  { id: 'stripe', name: 'stripe-billing', icon: '💳', iconBg: 'rgba(107,99,255,0.12)', status: 'Live', statusColor: '#00e68a', x: '30%', y: '80%', badge: '$49/mo' },
  { id: 'vercel', name: 'vercel-frontend', icon: '▲', iconBg: 'rgba(255,255,255,0.08)', status: 'Production', statusColor: '#00e68a', x: '68%', y: '80%', badge: 'React' },
];
const CONNECTIONS = [['api','supabase'],['api','n8n'],['api','stripe'],['api','vercel'],['supabase','stripe'],['vercel','n8n']];

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

const ERROR_LOGS = [
  { time: '12:47:31', service: 'agent-api', msg: 'WARN: Rate limit approached for org_stoic (8,412/10,000)', color: '#ff9f43' },
  { time: '12:46:58', service: 'n8n', msg: 'INFO: Workflow "lead-enrichment" completed in 2.3s', color: '#888' },
  { time: '12:46:12', service: 'agent-api', msg: 'ERROR: Webhook timeout for event checkout.session.completed', color: '#ff4757' },
  { time: '12:45:44', service: 'supabase', msg: 'INFO: RLS policy check passed for observations table', color: '#888' },
  { time: '12:45:01', service: 'vercel', msg: 'ERROR: No route matches URL /contact/', color: '#ff4757' },
];

// Generate stepped/jagged data like real monitoring
function genStepped(count, base, variance, trend = 0) {
  const pts = [];
  let v = base;
  for (let i = 0; i < count; i++) {
    const jump = Math.random() < 0.15;
    if (jump) v += (Math.random() - 0.4) * variance * 3;
    else v += (Math.random() - 0.48) * variance + trend;
    v = Math.max(0, v);
    pts.push(v);
  }
  return pts;
}

// Generate time labels like Railway (15:55, 16:00, 16:05, 16:10)
function getTimeLabels() {
  const now = new Date();
  const labels = [];
  for (let i = 3; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 5 * 60000);
    labels.push(t.getHours().toString().padStart(2, '0') + ':' + t.getMinutes().toString().padStart(2, '0'));
  }
  return labels;
}

/* ═══════════════════════════════════════════
   CHART COMPONENT — Railway-accurate
   ═══════════════════════════════════════════ */

function MonitorChart({ title, yLabels, series, timeLabels, thresholdY, thresholdLabel }) {
  const chartW = 400, chartH = 160;
  const padL = 48, padR = 8, padT = 8, padB = 24;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const yMax = parseFloat(yLabels[0]);
  const yMin = parseFloat(yLabels[yLabels.length - 1]) || 0;
  const yRange = yMax - yMin || 1;

  function toPath(data, stepped = true) {
    return data.map((v, i) => {
      const x = padL + (i / (data.length - 1)) * innerW;
      const y = padT + (1 - (v - yMin) / yRange) * innerH;
      if (i === 0) return `M${x},${y}`;
      if (stepped) {
        const prevX = padL + ((i - 1) / (data.length - 1)) * innerW;
        const prevY = padT + (1 - (data[i - 1] - yMin) / yRange) * innerH;
        return `H${x}V${y}`;
      }
      return `L${x},${y}`;
    }).join('');
  }

  function toFill(data) {
    const path = toPath(data);
    const lastX = padL + innerW;
    const firstX = padL;
    const bottom = padT + innerH;
    return `${path}L${lastX},${bottom}L${firstX},${bottom}Z`;
  }

  return (
    <div className="mon-card">
      <div className="mon-title">{title}</div>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="mon-svg">
        {/* Y-axis grid lines (dotted) */}
        {yLabels.map((label, i) => {
          const y = padT + (i / (yLabels.length - 1)) * innerH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={chartW - padR} y2={y}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
              <text x={padL - 6} y={y + 3} textAnchor="end"
                fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="'JetBrains Mono',monospace">
                {label}
              </text>
            </g>
          );
        })}

        {/* Threshold line */}
        {thresholdY != null && (() => {
          const y = padT + (1 - (thresholdY - yMin) / yRange) * innerH;
          return (
            <line x1={padL} y1={y} x2={chartW - padR} y2={y}
              stroke="rgba(255,200,50,0.35)" strokeWidth="1" strokeDasharray="6 3" />
          );
        })()}

        {/* Data series */}
        {series.map((s, si) => (
          <g key={si}>
            <defs>
              <linearGradient id={`mg-${si}-${title.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {s.fill && <path d={toFill(s.data)} fill={`url(#mg-${si}-${title.replace(/\s/g,'')})`} />}
            <path d={toPath(s.data)} fill="none" stroke={s.color} strokeWidth="1.2" />
          </g>
        ))}

        {/* X-axis time labels */}
        {timeLabels.map((label, i) => {
          const x = padL + (i / (timeLabels.length - 1)) * innerW;
          return (
            <text key={i} x={x} y={chartH - 4} textAnchor="middle"
              fill="rgba(255,255,255,0.25)" fontSize="7.5" fontFamily="'JetBrains Mono',monospace">
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════
   VIEWS
   ═══════════════════════════════════════════ */

function ArchitectureView() {
  const canvasRef = useRef(null);
  const [nodePos, setNodePos] = useState({});
  useEffect(() => {
    if (!canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    const p = {};
    SERVICES.forEach(s => { p[s.id] = { x: (parseFloat(s.x)/100)*r.width, y: (parseFloat(s.y)/100)*r.height }; });
    setNodePos(p);
  }, []);

  return (
    <div className="infra-canvas" ref={canvasRef}>
      <svg className="infra-lines">
        {Object.keys(nodePos).length > 0 && CONNECTIONS.map(([a,b],i) => (
          <line key={i} x1={nodePos[a]?.x} y1={nodePos[a]?.y} x2={nodePos[b]?.x} y2={nodePos[b]?.y} />
        ))}
      </svg>
      {SERVICES.map((s,i) => (
        <div key={s.id} className="infra-node" style={{ left: s.x, top: s.y, transform: 'translate(-50%,-50%)' }}>
          <div className="infra-node-header">
            <div className="infra-node-icon" style={{ background: s.iconBg }}>{s.icon}</div>
            <div className="infra-node-name">{s.name}</div>
          </div>
          <div className="infra-node-status">
            <span className="dot" style={{ background: s.statusColor }} />
            <span style={{ color: s.statusColor }}>{s.status}</span>
          </div>
          <div className="infra-node-badge" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}>📦 {s.badge}</div>
        </div>
      ))}
      <div className="infra-alert">
        <div className="infra-alert-title" style={{ color: '#00e68a' }}>✅ All Systems Operational</div>
        <div className="infra-alert-body">5 services · 0 errors · 99.9% uptime</div>
      </div>
    </div>
  );
}

function FleetView() {
  const sc = { live: '#00e68a', deploying: '#ff9f43', idle: '#555570' };
  const bc = { live: '#4d7cff', deploying: '#ff9f43', idle: '#2a2a3e' };
  return (
    <div className="infra-fleet">
      {AGENTS.map((a,i) => (
        <div key={i} className="infra-agent-card">
          <div className="infra-agent-card-header">
            <span className="infra-agent-name">{a.name}</span>
            <span className="infra-agent-dot" style={{ background: sc[a.status] }} />
          </div>
          <div className="infra-agent-type">{a.type}</div>
          <div className="infra-agent-bar"><div className="infra-agent-bar-fill" style={{ width: `${a.load}%`, background: bc[a.status] }} /></div>
        </div>
      ))}
    </div>
  );
}

function ScaleView() {
  const [replicas, setReplicas] = useState(1);
  const cpuData = useMemo(() => genStepped(30, 75, 8, 0.3), []);
  return (
    <div className="infra-scale">
      <div className="infra-scale-node">
        <div className="infra-scale-node-name">⚡ agent-api</div>
        <div className="infra-scale-warning">⚠️ High Agent Load</div>
        <svg viewBox="0 0 200 50" style={{ width: 180, height: 45, marginTop: 10 }}>
          <path d={cpuData.map((v,i) => {
            const x = (i/(cpuData.length-1))*200;
            const y = 50 - (v/100)*45;
            return i===0 ? `M${x},${y}` : `H${x}V${y}`;
          }).join('')} fill="none" stroke="#ff9f43" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="infra-scale-panel">
        <div className="infra-scale-label">agent-api › Replicas</div>
        {[1,2,3,5,10].map(n => (
          <div key={n} className={`infra-scale-option ${replicas===n?'active':''}`} onClick={() => setReplicas(n)}>
            <span>{n} Replica{n>1?'s':''}</span>
            {replicas===n && <span className="infra-scale-confirm">Current</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonitorView() {
  const timeLabels = useMemo(() => getTimeLabels(), []);
  const chartData = useMemo(() => ({
    memory: {
      title: 'Memory Usage',
      yLabels: ['25 GB', '20 GB', '15 GB', '10 GB', '5 GB', '0 B'],
      series: [
        { data: genStepped(60, 21, 1.5, 0.05), color: '#4ade80', fill: true },
        { data: genStepped(60, 7, 2, 0), color: '#e879a8', fill: false },
        { data: genStepped(60, 4, 1.5, 0), color: '#60a5fa', fill: false },
      ],
      thresholdY: 20,
    },
    latency: {
      title: 'Request Latency',
      yLabels: ['750 ms', '600 ms', '450 ms', '300 ms', '150 ms', '0 B'],
      series: [
        { data: genStepped(60, 140, 40, 0.8), color: '#e879a8', fill: false },
        { data: genStepped(60, 100, 30, 0), color: '#60a5fa', fill: false },
      ],
      thresholdY: 300,
    },
    disk: {
      title: 'Disk usage',
      yLabels: ['50 GB', '40 GB', '30 GB', '20 GB', '10 GB', '0 B'],
      series: [
        { data: genStepped(60, 18, 4, 0.15), color: '#2dd4bf', fill: false },
        { data: genStepped(60, 12, 2, 0.08), color: '#60a5fa', fill: false },
      ],
    },
    cpu: {
      title: 'CPU Usage',
      yLabels: ['2.5x', '2.0x', '1.5x', '1.0x', '0.5x', '0 B'],
      series: [
        { data: genStepped(60, 0.45, 0.1, 0), color: '#4ade80', fill: false },
        { data: genStepped(60, 0.35, 0.08, 0), color: '#e879a8', fill: false },
      ],
    },
    network: {
      title: 'Network egress',
      yLabels: ['200 MB', '150 MB', '100 MB', '50 MB', '0 B'],
      series: [
        { data: genStepped(60, 35, 12, 0), color: '#60a5fa', fill: false },
        { data: genStepped(60, 25, 8, 0), color: '#2dd4bf', fill: false },
      ],
    },
    obs: {
      title: 'Observations/min',
      yLabels: ['5K', '4K', '3K', '2K', '1K', '0'],
      series: [
        { data: genStepped(60, 2800, 400, 0), color: '#f59e0b', fill: true },
        { data: genStepped(60, 1200, 250, 0), color: '#a78bfa', fill: false },
      ],
    },
  }), []);

  return (
    <div className="mon-wrap">
      {/* Header bar like Railway */}
      <div className="mon-toolbar">
        <div className="mon-time-select">
          <span className="mon-clock-icon">⏱</span>
          <span>Last 15 min</span>
          <span className="mon-chevron">▾</span>
        </div>
        <div className="mon-edit-btn">✏️ Edit</div>
      </div>

      {/* 2×3 chart grid — Railway layout */}
      <div className="mon-grid">
        <MonitorChart {...chartData.memory} timeLabels={timeLabels} />
        <MonitorChart {...chartData.latency} timeLabels={timeLabels} />
        <MonitorChart {...chartData.disk} timeLabels={timeLabels} />
        <MonitorChart {...chartData.cpu} timeLabels={timeLabels} />
        <MonitorChart {...chartData.network} timeLabels={timeLabels} />
        <MonitorChart {...chartData.obs} timeLabels={timeLabels} />
      </div>

      {/* Error logs table */}
      <div className="mon-logs">
        <div className="mon-logs-title">Error logs</div>
        <div className="mon-logs-header">
          <span className="mon-log-col-time">Date (GMT-3)</span>
          <span className="mon-log-col-svc">Service</span>
          <span className="mon-log-col-msg">Message</span>
        </div>
        {ERROR_LOGS.map((l, i) => (
          <div key={i} className="mon-log-row" style={{ borderLeftColor: l.color }}>
            <span className="mon-log-col-time">{l.time}</span>
            <span className="mon-log-col-svc">{l.service}</span>
            <span className="mon-log-col-msg" style={{ color: l.color === '#888' ? 'rgba(255,255,255,0.5)' : l.color }}>{l.msg}</span>
          </div>
        ))}
      </div>
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
      <svg className="infra-lines" style={{ position:'absolute', inset:0, width:'100%', height:'100%', zIndex:1 }}>
        {lines.map(([a,b],i) => (
          <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
            stroke="rgba(155,89,255,0.15)" strokeWidth="1" strokeDasharray="4 3" />
        ))}
      </svg>
      {nodes.map((n,i) => (
        <div key={i} className={`infra-k-node ${n.center?'center':''}`}
          style={{ left:n.x, top:n.y, transform:'translate(-50%,-50%)' }}>{n.label}</div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

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
    arch: <ArchitectureView />, fleet: <FleetView />,
    scale: <ScaleView />, monitor: <MonitorView />,
    knowledge: <KnowledgeView />,
  };

  return (
    <div className="infra-sim">
      {views[activeTab]}
      <div className="infra-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`infra-tab ${activeTab===t.id?'active':''}`}
            onClick={() => setActiveTab(t.id)}>
            <span className="infra-tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
