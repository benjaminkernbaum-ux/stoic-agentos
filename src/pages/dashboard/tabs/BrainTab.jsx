import { useState } from 'react';
import { BRAIN_FILTERS, TYPE_ICONS } from '../constants';
import { supabase, API_BASE } from '../../../lib/supabase';

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
