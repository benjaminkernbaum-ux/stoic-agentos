import { useState, useEffect } from 'react';
import { supabase, API_BASE } from '../../../lib/supabase';

const getToken = async () =>
  (await supabase.auth.getSession()).data.session?.access_token;

/* ═════════════════════════════════════════════
   COMPLIANCE TAB — Audit Log + Circuit Breaker
   ═════════════════════════════════════════════ */
export default function ComplianceTab() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [breakerLoading, setBreakerLoading] = useState(false);
  const [breakerResult, setBreakerResult] = useState(null);
  const [exportRange, setExportRange] = useState({ from: '', to: '' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const token = await getToken();
    if (!token) { setLoading(false); return; }
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [statsRes, eventsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/compliance/stats`, { headers }),
        fetch(`${API_BASE}/api/v1/audit/log?limit=50`, { headers }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const triggerBreaker = async (action) => {
    if (!confirm(`Are you sure you want to ${action}? This will ${action === 'HALT_ALL' ? 'STOP all agents' : 'RESUME all agents'}.`)) return;
    setBreakerLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/compliance/circuit-breaker`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: `Manual ${action} from dashboard` }),
      });
      setBreakerResult(await res.json());
      fetchAll();
    } catch (e) {
      setBreakerResult({ error: e.message });
    }
    setBreakerLoading(false);
  };

  const verdictColors = {
    PROCEED: '#10b981', HALT: '#ef4444', ESCALATE: '#f59e0b', MONITOR: '#67e8f9',
  };

  const subTabs = [
    { id: 'overview', label: '📊 Stats' },
    { id: 'events', label: '📋 Audit Log' },
    { id: 'breaker', label: '🛑 Circuit Breaker' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 10, width: 'fit-content' }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setActiveSubTab(t.id)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: activeSubTab === t.id ? 600 : 400,
            background: activeSubTab === t.id ? 'rgba(239,68,68,0.15)' : 'transparent',
            color: activeSubTab === t.id ? '#fca5a5' : 'rgba(255,255,255,0.5)',
            transition: 'all 0.2s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Stats */}
      {activeSubTab === 'overview' && stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[
              { label: 'Total Events', value: stats.total_events, icon: '📊', color: '#a78bfa' },
              { label: 'Last 24h', value: stats.last_24h, icon: '📅', color: '#67e8f9' },
              { label: 'Last 7d', value: stats.last_7d, icon: '📆', color: '#10b981' },
              { label: 'Halts', value: stats.halts, icon: '🛑', color: '#ef4444' },
              { label: 'Escalations', value: stats.escalations, icon: '⚠️', color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${s.color}18`, fontSize: 18,
                }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            padding: 16, borderRadius: 12, background: 'rgba(16,185,129,0.05)',
            border: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <div>
              <div style={{ color: '#6ee7b7', fontWeight: 600, fontSize: 14 }}>Compliance Status: Active</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
                EU AI Act Article 12 (Logging) + Article 14 (Circuit Breaker) ready
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log */}
      {activeSubTab === 'events' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#fff' }}>Audit Trail ({events.length} events)</h3>
          {events.length === 0
            ? <div style={{ color: 'rgba(255,255,255,0.4)', padding: 24, textAlign: 'center' }}>No audit events yet.</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {events.map((e, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '90px 100px 1fr 80px 140px',
                    gap: 12, alignItems: 'center', padding: '10px 16px',
                    background: 'rgba(255,255,255,0.02)', borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.04)', fontSize: 12,
                  }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11,
                      background: `${verdictColors[e.verdict] || '#6b7280'}18`,
                      color: verdictColors[e.verdict] || '#9ca3af',
                    }}>
                      {e.verdict}
                    </span>
                    <span style={{ color: '#a78bfa' }}>{e.event_type}</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.action}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }}>
                      {e.context_hash?.slice(0, 8) || '—'}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* Circuit Breaker */}
      {activeSubTab === 'breaker' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{
            padding: 24, borderRadius: 12, textAlign: 'center',
            background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛑</div>
            <h3 style={{ color: '#fca5a5', margin: '0 0 8px', fontSize: 18 }}>Fleet Circuit Breaker</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 20px' }}>
              EU AI Act Article 14 — Human Oversight. Immediately halt or resume all agents.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => triggerBreaker('HALT_ALL')} disabled={breakerLoading}
                style={{
                  padding: '12px 28px', border: 'none', borderRadius: 8, cursor: breakerLoading ? 'wait' : 'pointer',
                  background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff',
                  fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
                }}
              >
                🛑 HALT ALL AGENTS
              </button>
              <button
                onClick={() => triggerBreaker('RESUME_ALL')} disabled={breakerLoading}
                style={{
                  padding: '12px 28px', border: 'none', borderRadius: 8, cursor: breakerLoading ? 'wait' : 'pointer',
                  background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff',
                  fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
                }}
              >
                ▶️ RESUME ALL AGENTS
              </button>
            </div>
          </div>

          {breakerResult && (
            <div style={{
              padding: 16, borderRadius: 8, fontSize: 13,
              background: breakerResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              border: `1px solid ${breakerResult.error ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
              color: breakerResult.error ? '#fca5a5' : '#6ee7b7',
            }}>
              {breakerResult.error
                ? `❌ ${breakerResult.error}`
                : `✅ ${breakerResult.action} — ${breakerResult.agents_affected} agents affected`
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}
