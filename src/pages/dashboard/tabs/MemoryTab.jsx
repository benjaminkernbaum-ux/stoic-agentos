import { useState, useEffect } from 'react';
import { supabase, API_BASE } from '../../../lib/supabase';

const getToken = async () =>
  (await supabase.auth.getSession()).data.session?.access_token;

/* ═════════════════════════════════════════════
   STAT CARD — glowing metric
   ═════════════════════════════════════════════ */
function StatCard({ label, value, icon, color = '#a78bfa' }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${color}18`, color, fontSize: 20,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{value}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════
   TRIPLE ROW — semantic knowledge triple
   ═════════════════════════════════════════════ */
function TripleRow({ t }) {
  const confColor = t.confidence >= 0.8 ? '#10b981' : t.confidence >= 0.5 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 80px',
      gap: 8, alignItems: 'center', padding: '10px 16px',
      background: 'rgba(255,255,255,0.02)', borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.04)', fontSize: 13,
    }}>
      <span style={{ color: '#a78bfa', fontWeight: 600 }}>{t.subject}</span>
      <span style={{ color: 'rgba(255,255,255,0.3)', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, fontSize: 11 }}>
        {t.relation}
      </span>
      <span style={{ color: '#67e8f9', fontWeight: 600 }}>{t.object}</span>
      <span style={{ color: confColor, fontSize: 11, fontWeight: 600 }}>{(t.confidence * 100).toFixed(0)}%</span>
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{t.source_type}</span>
    </div>
  );
}

/* ═════════════════════════════════════════════
   EPISODE ROW — episodic memory entry
   ═════════════════════════════════════════════ */
function EpisodeRow({ e }) {
  const importanceColor = e.importance >= 8 ? '#ef4444' : e.importance >= 5 ? '#f59e0b' : '#6b7280';
  return (
    <div style={{
      padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            padding: '2px 8px', background: 'rgba(167,139,250,0.15)', color: '#a78bfa',
            borderRadius: 4, fontSize: 11, fontWeight: 600,
          }}>
            {e.event_type}
          </span>
          <span style={{ color: importanceColor, fontSize: 11 }}>⬤ {e.importance}/10</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
          {new Date(e.created_at).toLocaleString()}
        </span>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.5 }}>
        {e.content?.slice(0, 200)}{e.content?.length > 200 ? '…' : ''}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════
   RECALL PANEL — hybrid memory search
   ═════════════════════════════════════════════ */
function RecallPanel() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('standard');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRecall = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/memory/recall`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mode }),
      });
      setResults(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12, padding: 24,
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
        🔍 Hybrid Memory Recall
      </h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRecall()}
          placeholder="Search across all memory tiers..."
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none',
          }}
        />
        <select
          value={mode} onChange={e => setMode(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none',
          }}
        >
          <option value="quick">⚡ Quick</option>
          <option value="standard">📋 Standard</option>
          <option value="deep">🔬 Deep</option>
        </select>
        <button
          onClick={handleRecall} disabled={loading || !query.trim()}
          style={{
            padding: '10px 20px', background: loading ? '#4b5563' : 'linear-gradient(135deg, #7c3aed, #a78bfa)',
            border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
            fontSize: 13,
          }}
        >
          {loading ? '...' : 'Recall'}
        </button>
      </div>

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            <span>Mode: <strong style={{ color: '#a78bfa' }}>{results.mode}</strong></span>
            <span>Results: <strong style={{ color: '#fff' }}>{results.total}</strong></span>
          </div>

          {results.working?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, marginBottom: 6 }}>Working Memory ({results.working.length})</div>
              {results.working.map((w, i) => (
                <div key={i} style={{ padding: '6px 12px', background: 'rgba(245,158,11,0.05)', borderRadius: 6, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                  <strong>{w.key}:</strong> {JSON.stringify(w.value).slice(0, 100)}
                </div>
              ))}
            </div>
          )}

          {results.semantic?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, marginBottom: 6 }}>Semantic Memory ({results.semantic.length})</div>
              {results.semantic.map((s, i) => (
                <div key={i} style={{ padding: '6px 12px', background: 'rgba(167,139,250,0.05)', borderRadius: 6, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                  {s.subject} → <em>{s.relation}</em> → {s.object} <span style={{ opacity: 0.5 }}>({(s.confidence * 100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          )}

          {results.episodic?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#67e8f9', fontWeight: 600, marginBottom: 6 }}>Episodic Memory ({results.episodic.length})</div>
              {results.episodic.map((e, i) => (
                <div key={i} style={{ padding: '6px 12px', background: 'rgba(103,232,249,0.05)', borderRadius: 6, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                  [{e.event_type}] {e.content?.slice(0, 120)}{e.content?.length > 120 ? '…' : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════
   MAIN MEMORY TAB
   ═════════════════════════════════════════════ */
export default function MemoryTab() {
  const [stats, setStats] = useState(null);
  const [triples, setTriples] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [reflecting, setReflecting] = useState(false);
  const [reflectionResult, setReflectionResult] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const token = await getToken();
    if (!token) { setLoading(false); return; }
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [statsRes, triplesRes, episodesRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/memory/stats`, { headers }),
        fetch(`${API_BASE}/api/v1/memory/semantic?limit=30`, { headers }),
        fetch(`${API_BASE}/api/v1/memory/episodic?limit=30`, { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (triplesRes.ok) setTriples(await triplesRes.json());
      if (episodesRes.ok) setEpisodes(await episodesRes.json());
    } catch (e) {
      console.error('Memory fetch error:', e);
    }
    setLoading(false);
  };

  const triggerReflection = async () => {
    setReflecting(true);
    setReflectionResult(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/memory/reflect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: 48, max_episodes: 30 }),
      });
      const data = await res.json();
      setReflectionResult(data);
      if (data.status === 'ok') fetchAll(); // Refresh triples
    } catch (e) {
      setReflectionResult({ error: e.message });
    }
    setReflecting(false);
  };

  const subTabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'semantic', label: '🧬 Knowledge Graph' },
    { id: 'episodic', label: '📅 Episodes' },
    { id: 'recall', label: '🔍 Recall' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 10, width: 'fit-content' }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setActiveSubTab(t.id)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: activeSubTab === t.id ? 600 : 400,
            background: activeSubTab === t.id ? 'rgba(167,139,250,0.2)' : 'transparent',
            color: activeSubTab === t.id ? '#a78bfa' : 'rgba(255,255,255,0.5)',
            transition: 'all 0.2s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeSubTab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <StatCard label="Working Memory" value={stats?.working_memory?.count ?? '—'} icon="⚡" color="#f59e0b" />
            <StatCard label="Episodic Memory" value={stats?.episodic_memory?.count ?? '—'} icon="📅" color="#67e8f9" />
            <StatCard label="Semantic Memory" value={stats?.semantic_memory?.count ?? '—'} icon="🧬" color="#a78bfa" />
            <StatCard label="Total Memories" value={stats?.total ?? '—'} icon="🧠" color="#10b981" />
          </div>

          <div style={{
            display: 'flex', gap: 12, alignItems: 'center', padding: '16px 20px',
            background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)',
            borderRadius: 12,
          }}>
            <button onClick={triggerReflection} disabled={reflecting} style={{
              padding: '10px 20px', border: 'none', borderRadius: 8, cursor: reflecting ? 'wait' : 'pointer',
              background: reflecting ? '#4b5563' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: '#fff', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
            }}>
              {reflecting ? '🔄 Reflecting...' : '🧠 Trigger Reflection'}
            </button>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              Claude Haiku scans recent episodes → extracts knowledge triples
            </span>
          </div>

          {reflectionResult && (
            <div style={{
              padding: 16, borderRadius: 8, fontSize: 13,
              background: reflectionResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              border: `1px solid ${reflectionResult.error ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
              color: reflectionResult.error ? '#fca5a5' : '#6ee7b7',
            }}>
              {reflectionResult.error
                ? `❌ ${reflectionResult.error}`
                : `✅ Processed ${reflectionResult.episodes_processed} episodes → extracted ${reflectionResult.triples_extracted} triples`
              }
            </div>
          )}
        </>
      )}

      {/* Semantic Memory */}
      {activeSubTab === 'semantic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#fff' }}>Knowledge Graph ({triples.length} triples)</h3>
          {triples.length === 0
            ? <div style={{ color: 'rgba(255,255,255,0.4)', padding: 24, textAlign: 'center' }}>No semantic triples yet. Trigger a reflection or store triples via the API.</div>
            : triples.map((t, i) => <TripleRow key={i} t={t} />)
          }
        </div>
      )}

      {/* Episodic Memory */}
      {activeSubTab === 'episodic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#fff' }}>Episodes ({episodes.length})</h3>
          {episodes.length === 0
            ? <div style={{ color: 'rgba(255,255,255,0.4)', padding: 24, textAlign: 'center' }}>No episodes recorded yet. Send events via the API or SDK.</div>
            : episodes.map((e, i) => <EpisodeRow key={i} e={e} />)
          }
        </div>
      )}

      {/* Recall */}
      {activeSubTab === 'recall' && <RecallPanel />}
    </div>
  );
}
