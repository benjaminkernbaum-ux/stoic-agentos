import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/* ── Original observation-based type colors ── */
const OBS_TYPE_COLORS = {
  architecture: '#9b59ff',
  decision: '#4d7cff',
  git_commit: '#00d4ff',
  deployment: '#00e68a',
  discovery: '#ff9f43',
  error: '#ff4757',
  note: 'rgba(255,255,255,0.4)',
  agent_run: '#00e68a',
  file_edit: '#00d4ff',
};

const OBS_TYPE_RADIUS = {
  architecture: 18,
  decision: 16,
  deployment: 16,
  error: 14,
  discovery: 14,
  note: 12,
  git_commit: 12,
};

/* ── Graph API node-type colors ── */
const API_TYPE_COLORS = {
  agent: '#9b59ff',
  workspace: '#00e68a',
  entity: '#ff9f43',
  model: '#00d4ff',
  observation_type: '#4d7cff',
};

/* ── Type icons for labels ── */
const API_TYPE_ICONS = {
  agent: '🤖',
  workspace: '📁',
  entity: '🧩',
  model: '⚡',
  observation_type: '🔬',
};

/**
 * Compute node radius based on mentions count.
 * Range: [10, 24] with sqrt scaling.
 */
function mentionRadius(mentions, maxMentions) {
  if (!mentions || mentions <= 0) return 10;
  const t = Math.sqrt(mentions / Math.max(maxMentions, 1));
  return 10 + t * 14; // 10..24
}

export default function KnowledgeGraph({
  observations,
  agents,
  onUpgrade,
  upgradeLoading,
  graphData = null,
  layout = 'force',
  searchQuery = '',
  onNodeClick = null,
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const animRef = useRef(null);
  const [dims, setDims] = useState({ w: 900, h: 500 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [dragNode, setDragNode] = useState(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const [, forceRender] = useState(0);
  const initedRef = useRef(false);
  const lastSourceRef = useRef(null); // 'api' | 'obs'

  // ── Measure container ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDims({ w: rect.width, h: rect.height });
    }
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 50 && height > 50) setDims({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Build graph from API data ──
  useEffect(() => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return;
    if (dims.w < 50 || dims.h < 50) return;

    lastSourceRef.current = 'api';
    const cx = dims.w / 2, cy = dims.h / 2;
    const maxMentions = Math.max(...graphData.nodes.map(n => n.mentions || 1));

    // Build node id -> index map
    const idMap = {};
    const nodes = graphData.nodes.map((n, i) => {
      idMap[n.id] = i;
      const r = mentionRadius(n.mentions, maxMentions);

      let x, y;
      if (layout === 'radial') {
        // Group by type in concentric rings
        const typeOrder = ['agent', 'workspace', 'entity', 'model', 'observation_type'];
        const ring = typeOrder.indexOf(n.type);
        const ringNodes = graphData.nodes.filter(nn => nn.type === n.type);
        const angleIdx = ringNodes.indexOf(n);
        const ringRadius = 60 + (ring >= 0 ? ring : 2) * 70;
        const angleSpread = (2 * Math.PI) / Math.max(ringNodes.length, 1);
        const angle = angleIdx * angleSpread + (ring * 0.5);
        x = cx + Math.cos(angle) * ringRadius + (Math.random() - 0.5) * 20;
        y = cy + Math.sin(angle) * ringRadius + (Math.random() - 0.5) * 20;
      } else {
        // Force-directed: random initial positions in a circle
        const baseRadius = Math.min(dims.w, dims.h) * 0.3;
        const angle = (i / graphData.nodes.length) * Math.PI * 2;
        x = cx + Math.cos(angle) * baseRadius + (Math.random() - 0.5) * 80;
        y = cy + Math.sin(angle) * baseRadius + (Math.random() - 0.5) * 80;
      }

      return {
        id: n.id,
        title: n.label,
        type: n.type,
        r,
        color: API_TYPE_COLORS[n.type] || '#9b59ff',
        x, y,
        vx: 0, vy: 0,
        mentions: n.mentions || 0,
        status: n.status || null,
        stack: n.stack || null,
        _highlighted: n._highlighted || false,
        _apiNode: true,
      };
    });

    // Build edges referencing indices
    const edges = [];
    for (const e of (graphData.edges || [])) {
      const si = idMap[e.source];
      const ti = idMap[e.target];
      if (si !== undefined && ti !== undefined) {
        edges.push({
          source: si,
          target: ti,
          strength: Math.min((e.weight || 1) * 0.3, 1),
          relationship: e.relationship || '',
          weight: e.weight || 1,
        });
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;
    initedRef.current = true;
    forceRender(v => v + 1);
  }, [graphData, dims, layout]);

  // ── Build graph from observations (fallback) ──
  useEffect(() => {
    if (graphData && graphData.nodes && graphData.nodes.length > 0) return;
    if (dims.w < 50 || dims.h < 50) return;
    const obs = observations.slice(0, 50);
    if (!obs.length) return;

    lastSourceRef.current = 'obs';
    const agentMap = {};
    agents.forEach(a => { agentMap[a.id] = a; });

    const cx = dims.w / 2, cy = dims.h / 2;
    const radius = Math.min(dims.w, dims.h) * 0.28;
    const nodes = obs.map((o, i) => {
      const angle = (i / obs.length) * Math.PI * 2;
      return {
        id: o.id,
        title: o.title,
        type: o.type || 'note',
        x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 60,
        y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 60,
        vx: 0, vy: 0,
        r: OBS_TYPE_RADIUS[o.type] || 12,
        color: OBS_TYPE_COLORS[o.type] || OBS_TYPE_COLORS.note,
        agent: o.agent_id ? agentMap[o.agent_id]?.name : null,
        _apiNode: false,
      };
    });

    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].type === nodes[j].type) {
          edges.push({ source: i, target: j, strength: 0.3 });
        } else if (nodes[i].agent && nodes[i].agent === nodes[j].agent) {
          edges.push({ source: i, target: j, strength: 0.5 });
        }
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;
    initedRef.current = true;
  }, [observations, agents, dims, graphData]);

  // ── Physics simulation ──
  useEffect(() => {
    if (!initedRef.current) return;
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    if (!nodes.length) return;

    let running = true;
    const tick = () => {
      if (!running) return;
      const cx = dims.w / 2, cy = dims.h / 2;

      // Center gravity
      for (const n of nodes) {
        n.vx += (cx - n.x) * 0.001;
        n.vy += (cy - n.y) * 0.001;
      }

      // Node repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 800 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx; nodes[i].vy -= fy;
          nodes[j].vx += fx; nodes[j].vy += fy;
        }
      }

      // Edge spring forces
      for (const e of edges) {
        const a = nodes[e.source], b = nodes[e.target];
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 100) * 0.002 * e.strength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }

      // Apply velocity and damping
      for (const n of nodes) {
        if (dragNode && n.id === dragNode) continue;
        n.vx *= 0.85; n.vy *= 0.85;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(n.r + 20, Math.min(dims.w - n.r - 20, n.x));
        n.y = Math.max(n.r + 40, Math.min(dims.h - n.r - 20, n.y));
      }

      forceRender(v => v + 1);
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [dims, dragNode]);

  // ── Mouse handlers ──
  const handleMouseDown = useCallback((e, nodeId) => {
    e.preventDefault();
    setDragNode(nodeId);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!dragNode || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = nodesRef.current.find(n => n.id === dragNode);
    if (node) { node.x = x; node.y = y; node.vx = 0; node.vy = 0; }
  }, [dragNode]);

  const handleMouseUp = useCallback(() => { setDragNode(null); }, []);

  const handleClick = useCallback((e, nodeId) => {
    if (onNodeClick) {
      onNodeClick(nodeId);
    }
  }, [onNodeClick]);

  const nodes = nodesRef.current;
  const edges = edgesRef.current;
  const isApiMode = lastSourceRef.current === 'api';
  const searchLower = searchQuery.toLowerCase();

  // ── Empty state ──
  if (!graphData && observations.length === 0) {
    return (
      <div className="dash-empty" style={{ padding: 60 }}>
        <div className="dash-empty-icon">🕸️</div>
        <h4>Knowledge Graph</h4>
        <p>Capture observations to see your knowledge graph come alive. Same-type observations cluster together.</p>
      </div>
    );
  }

  // ── Determine which colors to use for legend ──
  const legendColors = isApiMode ? API_TYPE_COLORS : OBS_TYPE_COLORS;
  const legendFilter = isApiMode
    ? Object.entries(legendColors)
    : Object.entries(legendColors).filter(([k]) => observations.some(o => o.type === k));

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 450 }}>
      {/* Legend */}
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexWrap: 'wrap', gap: 8, zIndex: 2 }}>
        {legendFilter.map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            {type.replace(/_/g, ' ')}
          </div>
        ))}
      </div>

      {/* Node count / Pro upsell (only in obs mode) */}
      {!isApiMode && (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{nodes.length}/{observations.length > 50 ? observations.length : 50} nodes</span>
          {observations.length > 50 && (
            <button className="btn btn-primary btn-sm" onClick={() => onUpgrade('pro')} disabled={upgradeLoading} style={{ fontSize: 11, padding: '4px 10px' }}>
              Unlock all → Pro
            </button>
          )}
        </div>
      )}

      {/* SVG Graph */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        style={{ width: '100%', height: '100%', cursor: dragNode ? 'grabbing' : 'default', display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-strong">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="bg-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(155,89,255,0.03)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Background glow */}
        <circle cx={dims.w / 2} cy={dims.h / 2} r={Math.min(dims.w, dims.h) * 0.4} fill="url(#bg-gradient)" />

        {/* Edges */}
        {edges.map((e, i) => {
          const src = nodes[e.source], tgt = nodes[e.target];
          if (!src || !tgt) return null;
          const isHovered = hoveredNode === src.id || hoveredNode === tgt.id;
          return (
            <g key={`edge-${i}`}>
              <line
                x1={src.x} y1={src.y}
                x2={tgt.x} y2={tgt.y}
                stroke={isHovered ? 'rgba(155,89,255,0.4)' : 'rgba(155,89,255,0.12)'}
                strokeWidth={isHovered ? 2 : (e.strength > 0.3 ? 1.5 : 0.8)}
                style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
              />
              {/* Relationship label on hover */}
              {isHovered && e.relationship && (
                <text
                  x={(src.x + tgt.x) / 2}
                  y={(src.y + tgt.y) / 2 - 6}
                  textAnchor="middle"
                  fill="rgba(167,139,250,0.8)"
                  fontSize={9}
                  fontWeight={600}
                  style={{ pointerEvents: 'none', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
                >
                  {e.relationship}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const isHighlighted = searchLower && node.title?.toLowerCase().includes(searchLower);
          const isDimmed = searchLower && !isHighlighted;
          const nodeOpacity = isDimmed ? 0.2 : (hoveredNode === node.id ? 1 : 0.75);

          return (
            <g key={node.id}>
              {/* Outer glow ring */}
              <circle
                cx={node.x} cy={node.y} r={node.r + 4}
                fill="none"
                stroke={node.color}
                strokeWidth={hoveredNode === node.id || isHighlighted ? 2.5 : 0}
                opacity={isHighlighted ? 0.9 : 0.5}
                filter={isHighlighted ? 'url(#glow-strong)' : 'url(#glow)'}
              />
              {/* Search highlight ring */}
              {isHighlighted && (
                <circle
                  cx={node.x} cy={node.y} r={node.r + 8}
                  fill="none"
                  stroke={node.color}
                  strokeWidth={1.5}
                  opacity={0.4}
                  className="dash-graph-highlight-ring"
                />
              )}
              {/* Main node circle */}
              <circle
                cx={node.x} cy={node.y} r={node.r}
                fill={node.color}
                opacity={nodeOpacity}
                style={{ cursor: 'grab', transition: 'opacity 0.15s' }}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={(e) => handleClick(e, node.id)}
              />
              {/* Label for larger/hovered nodes in API mode */}
              {isApiMode && (node.r >= 16 || hoveredNode === node.id || isHighlighted) && (
                <text
                  x={node.x} y={node.y - node.r - 6}
                  textAnchor="middle"
                  fill={isDimmed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.7)'}
                  fontSize={hoveredNode === node.id ? 11 : 9}
                  fontWeight={hoveredNode === node.id ? 700 : 500}
                  style={{ pointerEvents: 'none', textShadow: '0 1px 6px rgba(0,0,0,0.9)', transition: 'fill 0.2s' }}
                >
                  {node.title?.length > 20 ? node.title.slice(0, 18) + '…' : node.title}
                </text>
              )}
              {/* Tooltip on hover */}
              {hoveredNode === node.id && (
                <foreignObject
                  x={node.x - 120} y={node.y + node.r + 8}
                  width={240} height={60}
                  style={{ pointerEvents: 'none', overflow: 'visible' }}
                >
                  <div style={{
                    background: 'rgba(10,10,25,0.95)',
                    border: `1px solid ${node.color}66`,
                    borderRadius: 8, padding: '6px 12px',
                    fontSize: 11, color: '#fff',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{node.title}</div>
                    {isApiMode && (
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
                        {(API_TYPE_ICONS[node.type] || '') + ' ' + node.type.replace(/_/g, ' ')}
                        {node.mentions > 0 ? ` · ${node.mentions} mentions` : ''}
                      </div>
                    )}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>

      {/* Pro upsell banner (only in obs fallback mode) */}
      {!isApiMode && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(10,10,25,0.92)', border: '1px solid rgba(155,89,255,0.25)',
          borderRadius: 12, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 14,
          backdropFilter: 'blur(16px)', boxShadow: '0 4px 24px rgba(0,0,0,0.5)', zIndex: 3,
          maxWidth: '90%',
        }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Unlock Pro Graph</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
              Temporal clustering · Cross-repo analysis · SVG export · Unlimited nodes
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onUpgrade('pro')}
            disabled={upgradeLoading}
            style={{ fontSize: 11, padding: '5px 12px', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {upgradeLoading ? '...' : 'Upgrade — $29/mo'}
          </button>
        </div>
      )}
    </div>
  );
}
