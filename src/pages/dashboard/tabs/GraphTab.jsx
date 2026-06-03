import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, API_BASE } from '../../../lib/supabase';
import KnowledgeGraph from '../../../components/KnowledgeGraph';

/**
 * ═══════════════════════════════════════════════════
 *  GraphTab v2 — Interactive Semantic Knowledge Graph
 *  Fetches from GET /api/v1/graph, stats bar, controls,
 *  detail sidebar, and premium visualization
 * ═══════════════════════════════════════════════════
 */

const NODE_TYPE_META = {
  agent:            { icon: '🤖', color: '#9b59ff', label: 'Agents' },
  workspace:        { icon: '📁', color: '#00e68a', label: 'Workspaces' },
  entity:           { icon: '🧩', color: '#ff9f43', label: 'Entities' },
  model:            { icon: '⚡', color: '#00d4ff', label: 'Models' },
  observation_type: { icon: '🔬', color: '#4d7cff', label: 'Obs Types' },
};

const REFRESH_INTERVAL = 60_000;

async function getToken() {
  return (await supabase.auth.getSession()).data.session?.access_token;
}

/* ── Skeleton Loader ── */
function GraphSkeleton() {
  return (
    <div className="dash-graph-skeleton">
      <div className="dash-graph-skeleton-bar">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="dash-graph-skeleton-stat">
            <div className="dash-graph-skeleton-circle" />
            <div className="dash-graph-skeleton-line" />
          </div>
        ))}
      </div>
      <div className="dash-graph-skeleton-canvas">
        <div className="dash-graph-skeleton-pulse" />
      </div>
    </div>
  );
}

function DetailSidebar({ node, graphData, onClose }) {
  const connectedEdges = useMemo(() => {
    if (!node || !graphData?.edges) return [];
    return graphData.edges.filter(e => e.source === node.id || e.target === node.id);
  }, [graphData, node]);

  const connectedNodes = useMemo(() => {
    if (!node || !graphData?.nodes) return [];
    const connectedIds = new Set(
      connectedEdges.map(e => e.source === node.id ? e.target : e.source)
    );
    return graphData.nodes.filter(n => connectedIds.has(n.id));
  }, [graphData, connectedEdges, node]);

  if (!node) return null;

  const meta = NODE_TYPE_META[node.type] || NODE_TYPE_META.entity;

  return (
    <div className="dash-graph-sidebar open">
      <div className="dash-graph-sidebar-header">
        <div className="dash-graph-sidebar-type" style={{ background: `${meta.color}18`, color: meta.color, borderColor: `${meta.color}40` }}>
          <span>{meta.icon}</span>
          <span>{node.type.replace('_', ' ')}</span>
        </div>
        <button className="dash-graph-sidebar-close" onClick={onClose}>✕</button>
      </div>

      <h3 className="dash-graph-sidebar-title">{node.label}</h3>

      <div className="dash-graph-sidebar-stats">
        <div className="dash-graph-sidebar-stat">
          <span className="dash-graph-sidebar-stat-num">{node.mentions || 0}</span>
          <span className="dash-graph-sidebar-stat-lbl">Mentions</span>
        </div>
        <div className="dash-graph-sidebar-stat">
          <span className="dash-graph-sidebar-stat-num">{connectedEdges.length}</span>
          <span className="dash-graph-sidebar-stat-lbl">Connections</span>
        </div>
      </div>

      {/* Type-specific fields */}
      {node.type === 'agent' && node.status && (
        <div className="dash-graph-sidebar-field">
          <span className="dash-graph-sidebar-field-lbl">Status</span>
          <span className="dash-graph-sidebar-field-val" style={{ color: node.status === 'running' ? '#22c55e' : node.status === 'error' ? '#ef4444' : '#71717a' }}>
            {node.status}
          </span>
        </div>
      )}
      {node.type === 'agent' && (
        <div className="dash-graph-sidebar-field">
          <span className="dash-graph-sidebar-field-lbl">Total Runs</span>
          <span className="dash-graph-sidebar-field-val">{node.mentions || 0}</span>
        </div>
      )}
      {node.type === 'workspace' && node.stack && (
        <div className="dash-graph-sidebar-field">
          <span className="dash-graph-sidebar-field-lbl">Stack</span>
          <span className="dash-graph-sidebar-field-val">{node.stack}</span>
        </div>
      )}

      {/* Connected edges */}
      {connectedEdges.length > 0 && (
        <div className="dash-graph-sidebar-section">
          <span className="dash-graph-sidebar-section-title">Relationships</span>
          <div className="dash-graph-sidebar-edges">
            {connectedEdges.map((edge, i) => {
              const otherNodeId = edge.source === node.id ? edge.target : edge.source;
              const otherNode = graphData.nodes.find(n => n.id === otherNodeId);
              const otherMeta = otherNode ? (NODE_TYPE_META[otherNode.type] || NODE_TYPE_META.entity) : NODE_TYPE_META.entity;
              const isSource = edge.source === node.id;
              return (
                <div key={i} className="dash-graph-sidebar-edge">
                  <span className="dash-graph-sidebar-edge-icon">{otherMeta.icon}</span>
                  <span className="dash-graph-sidebar-edge-label">{otherNode?.label || otherNodeId}</span>
                  <span className="dash-graph-sidebar-edge-rel" style={{ color: otherMeta.color }}>
                    {isSource ? '→' : '←'} {edge.relationship}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connected nodes */}
      {connectedNodes.length > 0 && (
        <div className="dash-graph-sidebar-section">
          <span className="dash-graph-sidebar-section-title">Connected Nodes ({connectedNodes.length})</span>
          <div className="dash-graph-sidebar-connected">
            {connectedNodes.map(n => {
              const nMeta = NODE_TYPE_META[n.type] || NODE_TYPE_META.entity;
              return (
                <div key={n.id} className="dash-graph-sidebar-node-pill" style={{ borderColor: `${nMeta.color}40` }}>
                  <span style={{ color: nMeta.color }}>{nMeta.icon}</span>
                  <span>{n.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GraphTab({ observations, agents, handleUpgrade, upgradeLoading, toast }) {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilters, setTypeFilters] = useState({
    agent: true, workspace: true, entity: true, model: true, observation_type: true,
  });
  const [layout, setLayout] = useState('force');
  const [selectedNode, setSelectedNode] = useState(null);
  const refreshTimerRef = useRef(null);

  // ── Fetch graph data from API ──
  const fetchGraph = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/v1/graph`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Graph API returned ${res.status}`);
      const data = await res.json();
      setGraphData(data);
      setError(null);
    } catch (err) {
      console.error('Graph fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
    refreshTimerRef.current = setInterval(fetchGraph, REFRESH_INTERVAL);
    return () => clearInterval(refreshTimerRef.current);
  }, [fetchGraph]);

  // ── Filtered graph data ──
  const filteredGraphData = useMemo(() => {
    if (!graphData) return null;

    let nodes = graphData.nodes || [];
    let edges = graphData.edges || [];

    // Filter by type
    nodes = nodes.filter(n => typeFilters[n.type] !== false);
    const nodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

    // Search highlight
    if (search.trim()) {
      const q = search.toLowerCase();
      nodes = nodes.map(n => ({
        ...n,
        _highlighted: n.label.toLowerCase().includes(q),
      }));
    }

    return { nodes, edges };
  }, [graphData, typeFilters, search]);

  // ── Stats ──
  const stats = useMemo(() => {
    if (!graphData) return null;
    const nodes = graphData.nodes || [];
    const edges = graphData.edges || [];
    const typeCounts = {};
    for (const n of nodes) {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    }
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const possibleEdges = nodeCount > 1 ? (nodeCount * (nodeCount - 1)) / 2 : 1;
    const density = edgeCount / possibleEdges;
    return { nodeCount, edgeCount, density, typeCounts };
  }, [graphData]);

  // ── Toggle type filter ──
  const toggleType = useCallback((type) => {
    setTypeFilters(prev => ({ ...prev, [type]: !prev[type] }));
  }, []);

  // ── Node click handler ──
  const handleNodeClick = useCallback((nodeId) => {
    if (!graphData) return;
    const node = graphData.nodes.find(n => n.id === nodeId);
    setSelectedNode(node || null);
  }, [graphData]);

  // ── SVG Export ──
  const handleExportSVG = useCallback(() => {
    const svgEl = document.querySelector('.dash-graph-canvas-wrap svg');
    if (!svgEl) {
      toast?.('No graph to export', 'error');
      return;
    }
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agentos-knowledge-graph.svg';
    a.click();
    URL.revokeObjectURL(url);
    toast?.('Graph exported as SVG', 'success');
  }, [toast]);

  // ── JSON Export (legacy) ──
  const handleExportJSON = useCallback(() => {
    if (!graphData) return;
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agentos-graph-data.json';
    a.click();
    URL.revokeObjectURL(url);
    toast?.('Graph data exported as JSON', 'success');
  }, [graphData, toast]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="dash-content" style={{ height: 'calc(100vh - 80px)' }}>
        <GraphSkeleton />
      </div>
    );
  }

  // ── Error / empty fallback to observations ──
  const hasApiData = graphData && graphData.nodes && graphData.nodes.length > 0;

  return (
    <div className="dash-content dash-graph-content">

      {/* ── Stats Bar ── */}
      {stats && (
        <div className="dash-graph-stats-bar">
          <div className="dash-graph-stats-group">
            <div className="dash-graph-stat-item dash-graph-stat-primary">
              <span className="dash-graph-stat-num">{stats.nodeCount}</span>
              <span className="dash-graph-stat-lbl">Nodes</span>
            </div>
            <div className="dash-graph-stat-divider" />
            <div className="dash-graph-stat-item">
              <span className="dash-graph-stat-num">{stats.edgeCount}</span>
              <span className="dash-graph-stat-lbl">Edges</span>
            </div>
            <div className="dash-graph-stat-divider" />
            {Object.entries(NODE_TYPE_META).map(([type, meta]) => {
              const count = stats.typeCounts[type] || 0;
              if (count === 0) return null;
              return (
                <div key={type} className="dash-graph-stat-item">
                  <span className="dash-graph-stat-icon">{meta.icon}</span>
                  <span className="dash-graph-stat-num" style={{ color: meta.color }}>{count}</span>
                  <span className="dash-graph-stat-lbl">{meta.label}</span>
                </div>
              );
            })}
            <div className="dash-graph-stat-divider" />
            <div className="dash-graph-stat-item">
              <span className="dash-graph-stat-num" style={{ color: 'var(--accent-bright)' }}>
                {(stats.density * 100).toFixed(1)}%
              </span>
              <span className="dash-graph-stat-lbl">Density</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Controls Bar ── */}
      <div className="dash-graph-controls-bar">
        <div className="dash-graph-controls-left">
          {/* Search */}
          <div className="dash-graph-search-wrap">
            <span className="dash-graph-search-icon">🔍</span>
            <input
              type="text"
              className="dash-graph-search"
              placeholder="Search nodes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="dash-graph-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {/* Type filters */}
          <div className="dash-graph-type-filters">
            {Object.entries(NODE_TYPE_META).map(([type, meta]) => (
              <label key={type} className={`dash-graph-type-chip ${typeFilters[type] ? 'active' : ''}`}
                style={{ '--chip-color': meta.color }}
              >
                <input
                  type="checkbox"
                  checked={typeFilters[type]}
                  onChange={() => toggleType(type)}
                />
                <span className="dash-graph-type-chip-dot" style={{ background: meta.color }} />
                <span>{meta.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="dash-graph-controls-right">
          {/* Layout toggle */}
          <div className="dash-graph-layout-toggle">
            <button
              className={`dash-graph-layout-btn ${layout === 'force' ? 'active' : ''}`}
              onClick={() => setLayout('force')}
              title="Force-directed layout"
            >⚛</button>
            <button
              className={`dash-graph-layout-btn ${layout === 'radial' ? 'active' : ''}`}
              onClick={() => setLayout('radial')}
              title="Radial layout"
            >◎</button>
          </div>

          {/* Export buttons */}
          <button className="dash-graph-export-btn" onClick={handleExportSVG} title="Export as SVG">
            <span>📥</span> SVG
          </button>
          <button className="dash-graph-export-btn" onClick={handleExportJSON} title="Export as JSON">
            <span>📄</span> JSON
          </button>

          {/* Refresh */}
          <button className="dash-graph-export-btn" onClick={fetchGraph} title="Refresh">
            🔄
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="dash-graph-main">
        {/* Canvas */}
        <div className={`dash-graph-canvas-wrap ${selectedNode ? 'with-sidebar' : ''}`}>
          <div className="dash-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="dash-panel-head">
              <span className="dash-panel-title">
                <span className="dash-panel-title-icon">🕸️</span>
                Knowledge Graph
                <span style={{ fontSize: 11, opacity: 0.4, marginLeft: 8 }}>
                  {hasApiData
                    ? `${filteredGraphData?.nodes?.length || 0} nodes · ${filteredGraphData?.edges?.length || 0} edges`
                    : observations.length > 50
                      ? `50 / ${observations.length} nodes (Free tier)`
                      : `${observations.length} nodes`
                  }
                </span>
              </span>
              {error && (
                <span style={{ fontSize: 10, color: '#ef4444', opacity: 0.7 }}>
                  API unavailable — showing local data
                </span>
              )}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <KnowledgeGraph
                observations={observations}
                agents={agents}
                onUpgrade={handleUpgrade}
                upgradeLoading={upgradeLoading}
                graphData={hasApiData ? filteredGraphData : null}
                layout={layout}
                searchQuery={search}
                onNodeClick={handleNodeClick}
              />
            </div>
          </div>
        </div>

        {/* Detail Sidebar */}
        <DetailSidebar
          node={selectedNode}
          graphData={graphData}
          onClose={() => setSelectedNode(null)}
        />
      </div>
    </div>
  );
}
