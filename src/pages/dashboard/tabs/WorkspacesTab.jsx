import { useState, useCallback, useMemo } from 'react';
import { supabase, API_BASE } from '../../../lib/supabase';

/**
 * ═══════════════════════════════════════════════════
 *  WorkspacesTab — Premium Workspace Management
 *  Glassmorphism cards, search/filter/sort, expandable
 *  detail panels, delete w/ confirmation, SDK snippet
 * ═══════════════════════════════════════════════════
 */

/* ── Helpers ── */

const STACK_ICONS = {
  react: '⚛️', nextjs: '▲', vue: '💚', angular: '🅰️',
  python: '🐍', django: '🐍', flask: '🐍', fastapi: '🐍',
  node: '🟢', express: '🟢', nest: '🟢',
  mobile: '📱', 'react-native': '📱', flutter: '📱', swift: '📱',
  rust: '🦀', go: '🐹', java: '☕', kotlin: '🟣',
  typescript: '🔷', ruby: '💎', rails: '💎',
  docker: '🐳', kubernetes: '☸️',
};

function getStackIcon(stack) {
  if (!stack) return '📦';
  const key = stack.toLowerCase().trim();
  for (const [k, v] of Object.entries(STACK_ICONS)) {
    if (key.includes(k)) return v;
  }
  return '📦';
}

function timeAgo(ts) {
  if (!ts) return 'Never';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 0) return 'Just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d === 1) return '1 day ago';
  if (d < 30) return `${d} days ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function truncatePath(p, max = 38) {
  if (!p || p.length <= max) return p || '—';
  return '…' + p.slice(-(max - 1));
}

/* ── Main Component ── */

export default function WorkspacesTab({
  workspaces,
  setWorkspaces,
  observations = [],
  agents = [],
  setShowWsModal,
  toast,
}) {
  const [search, setSearch] = useState('');
  const [stackFilter, setStackFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [expandedId, setExpandedId] = useState(null);
  const [copiedField, setCopiedField] = useState(null);   // { wsId, field }
  const [confirmDelete, setConfirmDelete] = useState(null); // wsId

  /* ── Observation counts per workspace ── */
  const obsCountMap = useMemo(() => {
    const map = {};
    for (const o of observations) {
      const wid = o.workspace_id || o.workspace;
      if (wid) map[wid] = (map[wid] || 0) + 1;
    }
    return map;
  }, [observations]);

  /* ── Summary stats ── */
  const stats = useMemo(() => {
    const active = workspaces.filter(w => w.status === 'active').length;
    const stacks = new Set(workspaces.map(w => w.stack).filter(Boolean));
    const totalObs = workspaces.reduce((sum, w) => sum + (obsCountMap[w.id] || 0), 0);
    return { total: workspaces.length, active, stacks: stacks.size, totalObs };
  }, [workspaces, obsCountMap]);

  /* ── Unique stacks for filter dropdown ── */
  const uniqueStacks = useMemo(() => {
    const s = new Set(workspaces.map(w => w.stack).filter(Boolean));
    return [...s].sort();
  }, [workspaces]);

  /* ── Filtered + sorted ── */
  const filtered = useMemo(() => {
    let result = workspaces;

    // Stack filter
    if (stackFilter !== 'all') {
      result = result.filter(w => w.stack === stackFilter);
    }

    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(w =>
        (w.name || '').toLowerCase().includes(q) ||
        (w.stack || '').toLowerCase().includes(q) ||
        (w.path || '').toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
      // created_at desc
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return result;
  }, [workspaces, stackFilter, search, sortBy]);

  /* ── Copy helper ── */
  const copyText = useCallback((text, wsId, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField({ wsId, field });
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {});
  }, []);

  /* ── Delete workspace ── */
  const handleDelete = useCallback(async (wsId) => {
    if (confirmDelete !== wsId) {
      setConfirmDelete(wsId);
      return;
    }
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${wsId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) {
        setWorkspaces(prev => prev.filter(w => w.id !== wsId));
        if (toast) toast('Workspace deleted', 'success');
        if (expandedId === wsId) setExpandedId(null);
      } else {
        if (toast) toast('Failed to delete workspace', 'error');
      }
    } catch {
      if (toast) toast('Failed to delete workspace', 'error');
    }
    setConfirmDelete(null);
  }, [confirmDelete, setWorkspaces, toast, expandedId]);

  /* ── Recent observations for expanded panel ── */
  const getRecentObs = useCallback((wsId) => {
    return observations
      .filter(o => (o.workspace_id || o.workspace) === wsId)
      .slice(0, 5);
  }, [observations]);

  /* ── Agent activity for expanded panel ── */
  const getAgentActivity = useCallback((wsId) => {
    // Find agents that have observations in this workspace
    const agentIds = new Set();
    for (const o of observations) {
      if ((o.workspace_id || o.workspace) === wsId && o.agent_id) {
        agentIds.add(o.agent_id);
      }
    }
    return agents.filter(a => agentIds.has(a.id));
  }, [observations, agents]);

  /* ── SDK snippet ── */
  const sdkSnippet = `from stoicos import StoicClient

client = StoicClient(api_key="sk_live_xxx")
client.observe(
    workspace="my-app",
    type="note",
    title="First observation",
    content="Hello from the SDK!"
)`;

  const copySdkSnippet = useCallback(() => {
    navigator.clipboard.writeText(sdkSnippet).then(() => {
      setCopiedField({ wsId: '__sdk__', field: 'snippet' });
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {});
  }, [sdkSnippet]);

  /* ════════════════════════════════════
     RENDER
     ════════════════════════════════════ */

  // ── Empty State ──
  if (workspaces.length === 0) {
    return (
      <div className="dash-content">
        <div className="dash-panel">
          <div className="dash-ws-empty">
            <div className="dash-ws-empty-icon">📦</div>
            <h4>No workspaces connected</h4>
            <p>Add a workspace manually or use the SDK to auto-create them on first observation.</p>

            <div className="dash-ws-empty-snippet">
              <div className="dash-ws-snippet-head">
                <span className="dash-ws-snippet-lang">Python</span>
                <button
                  className="dash-ws-snippet-copy"
                  onClick={copySdkSnippet}
                >
                  {copiedField?.wsId === '__sdk__' ? '✓ Copied' : '⎘ Copy'}
                </button>
              </div>
              <pre className="dash-ws-snippet-code">{sdkSnippet}</pre>
            </div>

            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: 16 }}
              onClick={() => setShowWsModal(true)}
            >
              + Add Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-content">

      {/* ── Summary Stats Bar ── */}
      <div className="dash-ws-summary">
        <div className="dash-ws-summary-stats">
          <div className="dash-ws-summary-stat">
            <span className="dash-ws-summary-num">{stats.total}</span>
            <span className="dash-ws-summary-lbl">Workspaces</span>
          </div>
          <div className="dash-ws-summary-divider" />
          <div className="dash-ws-summary-stat">
            <span className="dash-ws-summary-dot active" />
            <span className="dash-ws-summary-num" style={{ color: '#22c55e' }}>{stats.active}</span>
            <span className="dash-ws-summary-lbl">Active</span>
          </div>
          <div className="dash-ws-summary-stat">
            <span className="dash-ws-summary-num">{stats.stacks}</span>
            <span className="dash-ws-summary-lbl">Stacks</span>
          </div>
          <div className="dash-ws-summary-stat">
            <span className="dash-ws-summary-num">{stats.totalObs}</span>
            <span className="dash-ws-summary-lbl">Observations</span>
          </div>
        </div>
        <div className="dash-ws-summary-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowWsModal(true)}>+ Add Workspace</button>
        </div>
      </div>

      {/* ── Search + Filter Bar ── */}
      <div className="dash-ws-toolbar">
        <input
          type="text"
          placeholder="Search workspaces…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="dash-ws-search-input"
        />
        <select
          className="dash-ws-select"
          value={stackFilter}
          onChange={e => setStackFilter(e.target.value)}
        >
          <option value="all">All stacks</option>
          {uniqueStacks.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="dash-ws-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="created_at">Newest first</option>
          <option value="name">Name A→Z</option>
          <option value="status">Status</option>
        </select>
      </div>

      {/* ── Cards Grid ── */}
      {filtered.length > 0 ? (
        <div className="dash-ws-grid">
          {filtered.map(ws => {
            const obsCount = obsCountMap[ws.id] || 0;
            const isExpanded = expandedId === ws.id;
            const isCopied = (field) => copiedField?.wsId === ws.id && copiedField?.field === field;
            const statusClass = ws.status === 'error' ? 'error' : ws.status === 'active' ? 'active' : 'inactive';

            return (
              <div key={ws.id} className={`dash-ws-card ${isExpanded ? 'expanded' : ''}`}>
                {/* Card Header — clickable to expand */}
                <div
                  className="dash-ws-card-top"
                  onClick={() => setExpandedId(isExpanded ? null : ws.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setExpandedId(isExpanded ? null : ws.id)}
                >
                  <div className="dash-ws-card-icon">{getStackIcon(ws.stack)}</div>
                  <div className="dash-ws-card-info">
                    <span className="dash-ws-card-name">{ws.name}</span>
                    <span className="dash-ws-card-date">{timeAgo(ws.created_at)}</span>
                  </div>
                  <div className={`dash-ws-status-dot ${statusClass}`} />
                </div>

                {/* Tags row */}
                <div className="dash-ws-meta">
                  {ws.stack && <span className="dash-ws-tag stack">🛠 {ws.stack}</span>}
                  <span className="dash-ws-tag branch">🌿 {ws.branch || 'main'}</span>
                  {obsCount > 0 && <span className="dash-ws-tag obs">👁 {obsCount}</span>}
                </div>

                {/* Path row */}
                {ws.path && (
                  <div className="dash-ws-path-row">
                    <span className="dash-ws-path-text">{truncatePath(ws.path)}</span>
                    <button
                      className="dash-ws-copy-btn"
                      onClick={e => { e.stopPropagation(); copyText(ws.path, ws.id, 'path'); }}
                      title="Copy path"
                    >
                      {isCopied('path') ? '✓' : '⎘'}
                    </button>
                  </div>
                )}

                {/* Git remote */}
                {ws.git_remote && (
                  <div className="dash-ws-remote">
                    <span className="dash-ws-remote-icon">🔗</span>
                    <span className="dash-ws-remote-text">{ws.git_remote}</span>
                  </div>
                )}

                {/* Delete button (hover reveal) */}
                <button
                  className={`dash-ws-delete-btn ${confirmDelete === ws.id ? 'confirming' : ''}`}
                  onClick={e => { e.stopPropagation(); handleDelete(ws.id); }}
                  onMouseLeave={() => { if (confirmDelete === ws.id) setConfirmDelete(null); }}
                >
                  {confirmDelete === ws.id ? 'Confirm?' : '🗑'}
                </button>

                {/* ── Expandable Detail Panel ── */}
                {isExpanded && (
                  <div className="dash-ws-detail">
                    <div className="dash-ws-detail-divider" />

                    {/* Full details */}
                    <div className="dash-ws-detail-section">
                      <div className="dash-ws-detail-label">Details</div>
                      <div className="dash-ws-detail-grid">
                        <div className="dash-ws-detail-item">
                          <span className="dash-ws-detail-key">Full Path</span>
                          <span className="dash-ws-detail-val mono">{ws.path || '—'}</span>
                          {ws.path && (
                            <button
                              className="dash-ws-copy-btn sm"
                              onClick={() => copyText(ws.path, ws.id, 'fullpath')}
                            >
                              {isCopied('fullpath') ? '✓' : '⎘'}
                            </button>
                          )}
                        </div>
                        <div className="dash-ws-detail-item">
                          <span className="dash-ws-detail-key">Git Remote</span>
                          <span className="dash-ws-detail-val mono">{ws.git_remote || '—'}</span>
                        </div>
                        <div className="dash-ws-detail-item">
                          <span className="dash-ws-detail-key">Branch</span>
                          <span className="dash-ws-detail-val">🌿 {ws.branch || 'main'}</span>
                        </div>
                        <div className="dash-ws-detail-item">
                          <span className="dash-ws-detail-key">Status</span>
                          <span className="dash-ws-detail-val">
                            <span className={`dash-ws-status-dot inline ${statusClass}`} />
                            {ws.status || 'inactive'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Recent observations */}
                    <div className="dash-ws-detail-section">
                      <div className="dash-ws-detail-label">Recent Observations ({obsCount})</div>
                      {(() => {
                        const recent = getRecentObs(ws.id);
                        if (recent.length === 0) {
                          return <div className="dash-ws-detail-empty">No observations yet</div>;
                        }
                        return (
                          <div className="dash-ws-detail-obs-list">
                            {recent.map(o => (
                              <div key={o.id} className="dash-ws-detail-obs">
                                <span className="dash-ws-detail-obs-type">{o.type || 'note'}</span>
                                <span className="dash-ws-detail-obs-title">{o.title || o.content?.slice(0, 40) || '—'}</span>
                                <span className="dash-ws-detail-obs-time">{timeAgo(o.created_at)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Agent activity */}
                    <div className="dash-ws-detail-section">
                      <div className="dash-ws-detail-label">Agent Activity</div>
                      {(() => {
                        const active = getAgentActivity(ws.id);
                        if (active.length === 0) {
                          return <div className="dash-ws-detail-empty">No agent activity</div>;
                        }
                        return (
                          <div className="dash-ws-detail-agents">
                            {active.map(a => (
                              <div key={a.id} className="dash-ws-detail-agent">
                                <span className="dash-ws-detail-agent-icon">🤖</span>
                                <span className="dash-ws-detail-agent-name">{a.name}</span>
                                <span className={`dash-ws-detail-agent-status ${a.status || 'idle'}`}>{a.status || 'idle'}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Quick actions */}
                    <div className="dash-ws-detail-actions">
                      <button
                        className="dash-ws-action-btn"
                        onClick={() => {
                          const snippet = `from stoicos import StoicClient\nclient = StoicClient(api_key="sk_live_xxx")\nclient.observe(workspace="${ws.name}", type="note", title="...")`;
                          copyText(snippet, ws.id, 'sdk');
                        }}
                      >
                        {isCopied('sdk') ? '✓ Copied' : '⎘ Copy SDK Snippet'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add card */}
          <button className="dash-ws-card dash-ws-add" onClick={() => setShowWsModal(true)}>
            <span className="dash-ws-add-icon">+</span>
            <span>Add Workspace</span>
          </button>
        </div>
      ) : (
        /* No results for filters */
        <div className="dash-ws-no-results">
          <div className="dash-ws-no-results-icon">🔍</div>
          <p>No workspaces match your filters</p>
          <button
            className="dash-ws-clear-btn"
            onClick={() => { setSearch(''); setStackFilter('all'); }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
