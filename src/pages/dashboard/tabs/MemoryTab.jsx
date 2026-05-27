import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

const API = import.meta.env.VITE_API_URL || 'https://stoic-agentos-api-production.up.railway.app';

function importanceBadge(imp) {
  if (imp >= 9) return { color: '#ef4444', label: 'Critical' };
  if (imp >= 7) return { color: '#f97316', label: 'High' };
  if (imp >= 4) return { color: '#eab308', label: 'Medium' };
  return { color: '#22c55e', label: 'Low' };
}

export default function MemoryTab() {
  const [stats, setStats] = useState({ working: 0, episodic: 0, semantic: 0 });
  const [working, setWorking] = useState([]);
  const [episodic, setEpisodic] = useState([]);
  const [semantic, setSemantic] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({ working: true, episodic: true, semantic: true });
  const [seeding, setSeeding] = useState(false);

  const headers = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' };
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const h = await headers();
      const [statsR, workR, epiR, semR] = await Promise.all([
        fetch(`${API}/api/v1/memory/stats`, { headers: h }).then(r => r.json()).catch(() => ({ working: 0, episodic: 0, semantic: 0 })),
        fetch(`${API}/api/v1/memory/working`, { headers: h }).then(r => r.json()).catch(() => []),
        fetch(`${API}/api/v1/memory/episodic`, { headers: h }).then(r => r.json()).catch(() => []),
        fetch(`${API}/api/v1/memory/semantic`, { headers: h }).then(r => r.json()).catch(() => []),
      ]);
      setStats(statsR);
      setWorking(Array.isArray(workR) ? workR : []);
      setEpisodic(Array.isArray(epiR) ? epiR : []);
      setSemantic(Array.isArray(semR) ? semR : []);
    } catch { /* silently degrade */ }
    setLoading(false);
  }, [headers]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const seedDemo = async () => {
    setSeeding(true);
    try {
      const h = await headers();
      await Promise.all([
        fetch(`${API}/api/v1/memory/working`, { method: 'POST', headers: h, body: JSON.stringify({ session_id: 'demo-session', key: 'current_task', value: { task: 'data-pipeline-v2', step: 3, total: 5 }, ttl_seconds: 3600 }) }),
        fetch(`${API}/api/v1/memory/working`, { method: 'POST', headers: h, body: JSON.stringify({ session_id: 'demo-session', key: 'user_context', value: { role: 'admin', preferences: { theme: 'dark' } }, ttl_seconds: 7200 }) }),
        fetch(`${API}/api/v1/memory/episodic`, { method: 'POST', headers: h, body: JSON.stringify({ content: 'Agent data-pipeline completed batch processing of 15,000 records with 99.2% accuracy', event_type: 'completion', importance: 7 }) }),
        fetch(`${API}/api/v1/memory/episodic`, { method: 'POST', headers: h, body: JSON.stringify({ content: 'Detected anomaly in customer churn predictions - model confidence dropped below 0.6 threshold', event_type: 'anomaly', importance: 9 }) }),
        fetch(`${API}/api/v1/memory/episodic`, { method: 'POST', headers: h, body: JSON.stringify({ content: 'RAG pipeline indexed 342 new documents from knowledge base update', event_type: 'observation', importance: 5 }) }),
        fetch(`${API}/api/v1/memory/semantic`, { method: 'POST', headers: h, body: JSON.stringify({ subject: 'data-pipeline', relation: 'depends_on', object: 'PostgreSQL', confidence: 0.95 }) }),
        fetch(`${API}/api/v1/memory/semantic`, { method: 'POST', headers: h, body: JSON.stringify({ subject: 'churn-predictor', relation: 'uses', object: 'XGBoost model v3', confidence: 0.88 }) }),
        fetch(`${API}/api/v1/memory/semantic`, { method: 'POST', headers: h, body: JSON.stringify({ subject: 'RAG pipeline', relation: 'produces', object: 'vector embeddings', confidence: 0.92 }) }),
      ]);
      await fetchAll();
    } catch { /* ignore */ }
    setSeeding(false);
  };

  const toggle = (tier) => setExpanded(prev => ({ ...prev, [tier]: !prev[tier] }));

  const isEmpty = stats.working === 0 && stats.episodic === 0 && stats.semantic === 0 && !loading;

  if (loading) {
    return (
      <div className="dash-tab-content">
        <div className="dash-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="dash-loading-spinner" />
          <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Loading memory tiers...</p>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="dash-tab-content">
        <div className="dash-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No memories yet</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Memories are created when your agents process data, make decisions, and learn from experience.
          </p>
          <button className="dash-btn dash-btn-primary" onClick={seedDemo} disabled={seeding}
            style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }}>
            {seeding ? 'Seeding...' : '✨ Seed Demo Data'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-tab-content">
      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Working Memory', count: stats.working, icon: '🧠', color: 'hsl(210, 80%, 65%)' },
          { label: 'Episodic Memory', count: stats.episodic, icon: '📝', color: 'var(--accent)' },
          { label: 'Semantic Memory', count: stats.semantic, icon: '🔗', color: 'hsl(150, 70%, 55%)' },
        ].map(s => (
          <div key={s.label} className="dash-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tier 1: Working Memory */}
      <div className="dash-card" style={{ marginBottom: '1rem' }}>
        <div onClick={() => toggle('working')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', cursor: 'pointer' }}>
          <h3 style={{ margin: 0, color: 'hsl(210, 80%, 65%)' }}>🧠 Working Memory <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>({working.length})</span></h3>
          <span style={{ color: 'var(--text-secondary)', transform: expanded.working ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
        </div>
        {expanded.working && (
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            {working.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No active working memory entries</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {working.map((w) => (
                  <div key={w.id} style={{ padding: '0.75rem', borderRadius: '8px', background: 'hsla(210, 80%, 65%, 0.08)', border: '1px solid hsla(210, 80%, 65%, 0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <code style={{ color: 'hsl(210, 80%, 65%)', fontSize: '0.85rem' }}>{w.key}</code>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>session: {w.session_id}</span>
                    </div>
                    <pre style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {JSON.stringify(w.value)}
                    </pre>
                    {w.expires_at && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                        Expires: {new Date(w.expires_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tier 2: Episodic Memory */}
      <div className="dash-card" style={{ marginBottom: '1rem' }}>
        <div onClick={() => toggle('episodic')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', cursor: 'pointer' }}>
          <h3 style={{ margin: 0, color: 'var(--accent)' }}>📝 Episodic Memory <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>({episodic.length})</span></h3>
          <span style={{ color: 'var(--text-secondary)', transform: expanded.episodic ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
        </div>
        {expanded.episodic && (
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            {episodic.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No episodic memories recorded</p>
            ) : (
              <div style={{ borderLeft: '2px solid var(--accent)', paddingLeft: '1rem', display: 'grid', gap: '0.75rem' }}>
                {episodic.map((e) => {
                  const badge = importanceBadge(e.importance);
                  return (
                    <div key={e.id} style={{ padding: '0.75rem', borderRadius: '8px', background: 'hsla(var(--accent-h, 270), 70%, 50%, 0.06)', border: '1px solid hsla(var(--accent-h, 270), 70%, 50%, 0.12)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'hsla(var(--accent-h, 270), 70%, 50%, 0.2)', color: 'var(--accent)' }}>{e.event_type}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: badge.color + '22', color: badge.color }}>{badge.label} ({e.importance})</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(e.valid_from).toLocaleString()}</span>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{e.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tier 3: Semantic Memory */}
      <div className="dash-card">
        <div onClick={() => toggle('semantic')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', cursor: 'pointer' }}>
          <h3 style={{ margin: 0, color: 'hsl(150, 70%, 55%)' }}>🔗 Semantic Memory <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>({semantic.length})</span></h3>
          <span style={{ color: 'var(--text-secondary)', transform: expanded.semantic ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
        </div>
        {expanded.semantic && (
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            {semantic.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No semantic knowledge extracted</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {semantic.map((s) => (
                  <div key={s.id} style={{ padding: '0.75rem', borderRadius: '8px', background: 'hsla(150, 70%, 55%, 0.06)', border: '1px solid hsla(150, 70%, 55%, 0.12)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: 600, color: 'hsl(150, 70%, 55%)', fontSize: '0.9rem' }}>{s.subject}</span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'hsla(150, 70%, 55%, 0.15)', color: 'hsl(150, 70%, 65%)' }}>{s.relation}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>→</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{s.object}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ width: '50px', height: '4px', borderRadius: '2px', background: 'hsla(150, 70%, 55%, 0.15)', overflow: 'hidden' }}>
                        <div style={{ width: `${(s.confidence || 0) * 100}%`, height: '100%', background: 'hsl(150, 70%, 55%)', borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{Math.round((s.confidence || 0) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
