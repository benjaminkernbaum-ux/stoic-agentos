import { useState, useEffect } from 'react';
import { BRAIN_FILTERS, TYPE_ICONS } from '../constants';
import { supabase, API_BASE } from '../../../lib/supabase';

// ── Hot Cache Panel (LLM Wiki pattern from claude-obsidian) ──
function HotCachePanel() {
  const [cache, setCache] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);

  const getToken = async () =>
    (await supabase.auth.getSession()).data.session?.access_token;

  const fetchCache = async () => {
    const token = await getToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE}/api/v1/insights/hot-cache`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (res.ok) setCache(body);
      else setError(body.error);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const refreshCache = async () => {
    setRefreshing(true);
    setError(null);
    const token = await getToken();
    try {
      const res = await fetch(`${API_BASE}/api/v1/insights/hot-cache/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const body = await res.json();
      if (res.ok) {
        setCache(body);
        setExpanded(true);
      } else {
        setError(body.error || `HTTP ${res.status}`);
      }
    } catch (e) {
      setError(e.message);
    }
    setRefreshing(false);
  };

  useEffect(() => { fetchCache(); }, []);

  // Relative time helper
  const timeAgo = (iso) => {
    if (!iso) return 'never';
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (loading) return null;
  if (cache?.status === 'unavailable') return null;

  const isFresh = cache?.status === 'fresh';
  const isStale = cache?.status === 'stale';
  const isEmpty = cache?.status === 'empty' || !cache?.hot_cache;
  const hasContent = cache?.hot_cache && cache.hot_cache.length > 0;

  return (
    <div
      className="dash-panel"
      style={{
        marginBottom: 16,
        borderLeft: `2px solid ${isFresh ? 'var(--accent-green)' : isStale ? 'var(--accent-orange)' : 'var(--border-glow)'}`,
        transition: 'border-color 0.3s',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: hasContent ? 'pointer' : 'default',
          padding: hasContent && expanded ? '0 0 12px 0' : 0,
        }}
        onClick={() => hasContent && setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18, filter: 'drop-shadow(0 0 6px rgba(0,230,138,0.3))' }}>⚡</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              Hot Cache
              {/* Status badge */}
              {hasContent && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: isFresh
                      ? 'rgba(0,230,138,0.12)'
                      : 'rgba(255,159,67,0.12)',
                    color: isFresh ? 'var(--accent-green)' : 'var(--accent-orange)',
                    border: `1px solid ${isFresh ? 'rgba(0,230,138,0.25)' : 'rgba(255,159,67,0.25)'}`,
                    animation: isStale ? 'pulse-dot 2s infinite' : 'none',
                  }}
                >
                  {isFresh ? '● Fresh' : '● Stale'}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, opacity: 0.55 }}>
              {hasContent
                ? `${cache.word_count} words · Updated ${timeAgo(cache.updated_at)}`
                : 'Pre-synthesized context for instant insights'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasContent && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                opacity: 0.6,
                transition: 'opacity 0.15s',
              }}
            >
              {expanded ? '▲' : '▼'}
            </button>
          )}
          <button
            className="btn btn-sm"
            onClick={(e) => { e.stopPropagation(); refreshCache(); }}
            disabled={refreshing}
            style={{
              background: refreshing ? 'rgba(155,89,255,0.08)' : 'rgba(0,230,138,0.08)',
              border: `1px solid ${refreshing ? 'rgba(155,89,255,0.2)' : 'rgba(0,230,138,0.2)'}`,
              color: refreshing ? 'var(--accent-purple)' : 'var(--accent-green)',
              transition: 'all 0.2s',
            }}
          >
            {refreshing ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(155,89,255,0.3)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Synthesizing...
              </span>
            ) : (
              isEmpty ? '⚡ Generate' : '↻ Refresh'
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ color: '#ff4757', fontSize: 12, padding: '8px 12px', background: 'rgba(255,71,87,0.08)', borderRadius: 6, marginTop: 8 }}>
          {error}
        </div>
      )}

      {/* Expanded cache content */}
      {expanded && hasContent && (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.75,
            whiteSpace: 'pre-wrap',
            color: 'rgba(255,255,255,0.82)',
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 8,
            border: '1px solid var(--border)',
            maxHeight: 400,
            overflowY: 'auto',
            position: 'relative',
          }}
        >
          {/* Subtle gradient fade at bottom when scrollable */}
          <div style={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            height: 24,
            background: 'linear-gradient(transparent, rgba(22,22,31,0.8))',
            pointerEvents: 'none',
            marginTop: -24,
          }} />
          {cache.hot_cache}
        </div>
      )}

      {/* Inline keyframes for spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function InsightsPanel() {
  const [hours, setHours] = useState(168);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    try {
      const res = await fetch(`${API_BASE}/api/v1/insights/summarize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      });
      const body = await res.json();
      if (!res.ok) setError(body.error || `HTTP ${res.status}`);
      else setResult(body);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  return (
    <div className="dash-panel" style={{ marginBottom: 16, borderLeft: '2px solid var(--accent-purple)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: result || error ? 12 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>🧠</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>AI Summary</div>
            <div style={{ fontSize: 11, opacity: 0.55 }}>Claude-powered briefing of recent activity</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            disabled={busy}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 12 }}
          >
            <option value={24}>Last 24h</option>
            <option value={168}>Last 7 days</option>
            <option value={720}>Last 30 days</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={run} disabled={busy}>
            {busy ? 'Summarizing...' : 'Summarize'}
          </button>
        </div>
      </div>
      {error && (
        <div style={{ color: '#ff4757', fontSize: 12, padding: '8px 12px', background: 'rgba(255,71,87,0.08)', borderRadius: 6 }}>
          {error}
        </div>
      )}
      {result && (
        <div>
          <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.85)' }}>
            {result.summary}
          </div>
          <div style={{ fontSize: 10, opacity: 0.4, marginTop: 10, display: 'flex', gap: 12 }}>
            <span>{result.count} observations</span>
            <span>{result.model}</span>
            <span>{result.usage?.input_tokens}→{result.usage?.output_tokens} tokens</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrainTab({ observations, brainFilter, setBrainFilter, obsSearch, setObsSearch, expandedObs, setExpandedObs, handleDeleteObs, handleSeedDemo, seedLoading, knowledgeItems, setShowKiModal }) {
  const filteredObs = observations.filter(o => {
    if (brainFilter !== 'all' && o.type !== brainFilter) return false;
    if (obsSearch) {
      const q = obsSearch.toLowerCase();
      return (o.title || '').toLowerCase().includes(q) || (o.content || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="dash-content">
      <HotCachePanel />
      <InsightsPanel />
      <div className="dash-panel">
        {/* Search bar */}
        <div style={{ marginBottom: 12 }}>
          <input
            type="text" placeholder="Search observations..."
            value={obsSearch} onChange={e => setObsSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)' }}
          />
        </div>
        {/* Filter pills with counts */}
        <div className="dash-filter-bar">
          {BRAIN_FILTERS.map(f => {
            const count = f === 'all' ? observations.length : observations.filter(o => o.type === f).length;
            return (
              <button key={f} className={`dash-filter-pill${brainFilter === f ? ' active' : ''}`} onClick={() => setBrainFilter(f)}>
                {f === 'all' ? 'All' : f.replace('_', ' ')} {count > 0 && <span style={{ marginLeft: 4, opacity: 0.5 }}>({count})</span>}
              </button>
            );
          })}
        </div>

        {filteredObs.length > 0 ? (
          <div className="dash-obs-list">
            {filteredObs.map(obs => (
              <div key={obs.id} className={`dash-obs-row${expandedObs === obs.id ? ' expanded' : ''}`} onClick={() => setExpandedObs(expandedObs === obs.id ? null : obs.id)} style={{ cursor: 'pointer' }}>
                <div className={`dash-obs-icon-wrap ${obs.type || 'note'}`}>
                  {TYPE_ICONS[obs.type] || '📌'}
                </div>
                <div className="dash-obs-body" style={{ flex: 1 }}>
                  <div className="dash-obs-title">{obs.title}</div>
                  {expandedObs === obs.id && obs.content && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '8px 0', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, lineHeight: 1.6, borderLeft: '2px solid var(--accent-purple)' }}>
                      {obs.content}
                    </div>
                  )}
                  <div className="dash-obs-meta">
                    <span className={`dash-obs-type ${obs.type || 'note'}`}>{obs.type || 'note'}</span>
                    <span className="dash-obs-time">{new Date(obs.created_at).toLocaleString()}</span>
                  </div>
                </div>
                {expandedObs === obs.id && (
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteObs(obs.id); }} style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', color: '#ff4757', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', marginLeft: 8, whiteSpace: 'nowrap' }}>
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="dash-empty" style={{ padding: 60 }}>
            <div className="dash-empty-icon">🧠</div>
            <h4>{brainFilter !== 'all' ? `No "${brainFilter}" observations` : 'Knowledge brain is empty'}</h4>
            <p>Capture observations or seed demo data to get started.</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => handleSeedDemo()} disabled={seedLoading}>{seedLoading ? '...' : '⚡ Seed Demo Data'}</button>
          </div>
        )}
      </div>

      {/* Knowledge Items section */}
      <div className="dash-panel" style={{ marginTop: 14 }}>
        <div className="dash-panel-head">
          <span className="dash-panel-title">
            <span className="dash-panel-title-icon">💡</span>
            Knowledge Items
            {knowledgeItems.length > 0 && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.4 }}>({knowledgeItems.length})</span>}
          </span>
          <button className="dash-panel-action" onClick={() => setShowKiModal(true)}>+ Create</button>
        </div>
        {knowledgeItems.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
            {knowledgeItems.map(ki => (
              <div key={ki.id} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line-mid)', borderRadius: 10, transition: 'border-color 0.15s' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{ki.name || ki.title || ki.key}</div>
                {ki.summary && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>{ki.summary}</div>}
                {ki.content && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{ki.content.substring(0, 200)}{ki.content.length > 200 ? '...' : ''}</div>}
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', marginTop: 6 }}>{new Date(ki.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dash-empty">
            <div className="dash-empty-icon">💡</div>
            <p>Persist decisions, architecture choices, and discoveries.</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setShowKiModal(true)}>+ Create Knowledge Item</button>
          </div>
        )}
      </div>
    </div>
  );
}
