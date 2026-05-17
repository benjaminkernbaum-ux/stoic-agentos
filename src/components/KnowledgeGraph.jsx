import { useState, useEffect, useRef, useCallback } from 'react';

const TYPE_COLORS = {
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

const TYPE_RADIUS = {
  architecture: 18,
  decision: 16,
  deployment: 16,
  error: 14,
  discovery: 14,
  note: 12,
  git_commit: 12,
};

export default function KnowledgeGraph({ observations, agents, onUpgrade, upgradeLoading }) {
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

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Initial measurement
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

  // Build graph data from observations (limited to 50 for free)
  useEffect(() => {
    if (dims.w < 50 || dims.h < 50) return;
    const obs = observations.slice(0, 50);
    if (!obs.length) return;
    const agentMap = {};
    agents.forEach(a => { agentMap[a.id] = a; });

    // Create nodes — distribute in a circle
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
        r: TYPE_RADIUS[o.type] || 12,
        color: TYPE_COLORS[o.type] || TYPE_COLORS.note,
        agent: o.agent_id ? agentMap[o.agent_id]?.name : null,
      };
    });

    // Create edges (same type = connected)
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
  }, [observations, agents, dims]);

  // Physics simulation
  useEffect(() => {
    if (!initedRef.current) return;
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    if (!nodes.length) return;

    let running = true;
    const tick = () => {
      if (!running) return;
      const cx = dims.w / 2, cy = dims.h / 2;

      for (const n of nodes) {
        n.vx += (cx - n.x) * 0.001;
        n.vy += (cy - n.y) * 0.001;
      }

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

  const nodes = nodesRef.current;
  const edges = edgesRef.current;

  if (observations.length === 0) {
    return (
      <div className="dash-empty" style={{ padding: 60 }}>
        <div className="dash-empty-icon">🕸️</div>
        <h4>Knowledge Graph</h4>
        <p>Capture observations to see your knowledge graph come alive. Same-type observations cluster together.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 450 }}>
      {/* Legend */}
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexWrap: 'wrap', gap: 8, zIndex: 2 }}>
        {Object.entries(TYPE_COLORS).filter(([k]) => observations.some(o => o.type === k)).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            {type.replace('_', ' ')}
          </div>
        ))}
      </div>

      {/* Node count / Pro upsell */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{nodes.length}/{observations.length > 50 ? observations.length : 50} nodes</span>
        {observations.length > 50 && (
          <button className="btn btn-primary btn-sm" onClick={() => onUpgrade('pro')} disabled={upgradeLoading} style={{ fontSize: 11, padding: '4px 10px' }}>
            Unlock all → Pro
          </button>
        )}
      </div>

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
          return (
            <line
              key={i}
              x1={src.x} y1={src.y}
              x2={tgt.x} y2={tgt.y}
              stroke="rgba(155,89,255,0.12)"
              strokeWidth={e.strength > 0.3 ? 1.5 : 0.8}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(node => (
          <g key={node.id}>
            <circle
              cx={node.x} cy={node.y} r={node.r + 4}
              fill="none"
              stroke={node.color}
              strokeWidth={hoveredNode === node.id ? 2.5 : 0}
              opacity={0.5}
              filter="url(#glow)"
            />
            <circle
              cx={node.x} cy={node.y} r={node.r}
              fill={node.color}
              opacity={hoveredNode === node.id ? 1 : 0.75}
              style={{ cursor: 'grab', transition: 'opacity 0.15s' }}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            />
            {hoveredNode === node.id && (
              <foreignObject
                x={node.x - 110} y={node.y + node.r + 8}
                width={220} height={50}
                style={{ pointerEvents: 'none', overflow: 'visible' }}
              >
                <div style={{
                  background: 'rgba(10,10,25,0.95)',
                  border: '1px solid rgba(155,89,255,0.4)',
                  borderRadius: 8, padding: '6px 12px',
                  fontSize: 11, color: '#fff',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}>
                  {node.title}
                </div>
              </foreignObject>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
