import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

const API = import.meta.env.VITE_API_URL || 'https://stoic-agentos-api-production.up.railway.app';

const VERDICT_COLORS = { PROCEED: '#22c55e', BLOCK: '#ef4444', WARN: '#eab308' };
const CIRCUIT_COLORS = { closed: '#22c55e', 'half-open': '#eab308', open: '#ef4444' };
const CIRCUIT_LABELS = { closed: 'Healthy', 'half-open': 'Warning', open: 'Tripped' };

export default function ComplianceTab() {
  const [auditLog, setAuditLog] = useState([]);
  const [stats, setStats] = useState({ total: 0, by_type: {}, by_verdict: {}, by_day: {} });
  const [breakers, setBreakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filters, setFilters] = useState({ event_type: '', verdict: '' });

  const headers = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' };
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const h = await headers();
      let logUrl = `${API}/api/v1/compliance/audit-log`;
      const params = new URLSearchParams();
      if (filters.event_type) params.set('event_type', filters.event_type);
      if (filters.verdict) params.set('verdict', filters.verdict);
      if (params.toString()) logUrl += `?${params}`;

      const [logR, statsR, breakerR] = await Promise.all([
        fetch(logUrl, { headers: h }).then(r => r.json()).catch(() => []),
        fetch(`${API}/api/v1/compliance/audit-log/stats`, { headers: h }).then(r => r.json()).catch(() => ({ total: 0, by_type: {}, by_verdict: {}, by_day: {} })),
        fetch(`${API}/api/v1/compliance/circuit-breaker`, { headers: h }).then(r => r.json()).catch(() => []),
      ]);
      setAuditLog(Array.isArray(logR) ? logR : []);
      setStats(statsR);
      setBreakers(Array.isArray(breakerR) ? breakerR : []);
    } catch { /* silently degrade */ }
    setLoading(false);
  }, [headers, filters]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const seedDemo = async () => {
    setSeeding(true);
    try {
      const h = await headers();
      const entries = [
        { event_type: 'policy_check', action: 'Agent requested external API access', verdict: 'PROCEED', reasoning: 'API endpoint is whitelisted' },
        { event_type: 'policy_check', action: 'Agent attempted to delete production data', verdict: 'BLOCK', reasoning: 'Destructive operations require manual approval' },
        { event_type: 'rate_limit', action: 'Agent exceeded 100 requests/minute threshold', verdict: 'WARN', reasoning: 'Throttled to 50 req/min for 5 minutes' },
        { event_type: 'reflection', action: 'Extracted 8 semantic triplets from 20 episodes', verdict: 'PROCEED', reasoning: 'Routine reflection cycle completed successfully' },
        { event_type: 'authentication', action: 'New API key generated for agent code-reviewer', verdict: 'PROCEED', reasoning: 'Key rotation per 30-day policy' },
        { event_type: 'policy_check', action: 'Agent attempted to access PII without encryption', verdict: 'BLOCK', reasoning: 'PII access requires encrypted channel - policy v2.1' },
        { event_type: 'deployment', action: 'Agent data-pipeline deployed to production', verdict: 'PROCEED', reasoning: 'All health checks passed' },
        { event_type: 'anomaly', action: 'Unusual spike in error observations detected', verdict: 'WARN', reasoning: 'Error rate 23% exceeds 10% threshold' },
      ];
      await Promise.all(entries.map(e => fetch(`${API}/api/v1/compliance/audit-log`, { method: 'POST', headers: h, body: JSON.stringify(e) })));
      await fetchAll();
    } catch { /* ignore */ }
    setSeeding(false);
  };

  const exportSIEM = async () => {
    try {
      const h = await headers();
      const res = await fetch(`${API}/api/v1/compliance/audit-log/export`, { headers: h });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const isEmpty = stats.total === 0 && !loading;

  if (loading) {
    return (
      <div className="dash-tab-content">
        <div className="dash-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="dash-loading-spinner" />
          <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Loading compliance data...</p>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="dash-tab-content">
        <div className="dash-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No audit entries yet</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            Audit entries are created automatically when agents make decisions, encounter policy boundaries, or trigger circuit breakers.
          </p>
          <button className="dash-btn dash-btn-primary" onClick={seedDemo} disabled={seeding}
            style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }}>
            {seeding ? 'Seeding...' : '✨ Seed Demo Data'}
          </button>
        </div>
      </div>
    );
  }

  const eventTypes = [...new Set(auditLog.map(a => a.event_type))];

  return (
    <div className="dash-tab-content">
      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="dash-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.total}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Entries</div>
        </div>
        <div className="dash-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            {['PROCEED', 'BLOCK', 'WARN'].map(v => (
              <div key={v} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: VERDICT_COLORS[v] }}>{stats.by_verdict?.[v] || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.3rem' }}>Verdict Breakdown</div>
        </div>
        <div className="dash-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent)' }}>
            {Object.keys(stats.by_day || {}).length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Days</div>
        </div>
      </div>

      {/* Circuit Breakers */}
      {breakers.length > 0 && (
        <div className="dash-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--text-primary)' }}>⚡ Circuit Breakers</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {breakers.map(b => (
              <div key={b.agent_id} style={{
                padding: '0.75rem', borderRadius: '8px', border: `1px solid ${CIRCUIT_COLORS[b.circuit_status]}33`,
                background: `${CIRCUIT_COLORS[b.circuit_status]}08`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{b.agent_name}</span>
                  <span style={{
                    fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px',
                    background: `${CIRCUIT_COLORS[b.circuit_status]}22`,
                    color: CIRCUIT_COLORS[b.circuit_status],
                    animation: b.circuit_status === 'open' ? 'pulse 2s infinite' : 'none',
                  }}>
                    {CIRCUIT_LABELS[b.circuit_status]}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                  {b.blocks_last_hour} blocks in last hour
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log */}
      <div className="dash-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>📋 Audit Log</h3>
          <button className="dash-btn" onClick={exportSIEM} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
            📥 Export SIEM
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <select value={filters.event_type} onChange={e => setFilters(f => ({ ...f, event_type: e.target.value }))}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
            <option value="">All Types</option>
            {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filters.verdict} onChange={e => setFilters(f => ({ ...f, verdict: e.target.value }))}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
            <option value="">All Verdicts</option>
            <option value="PROCEED">PROCEED</option>
            <option value="BLOCK">BLOCK</option>
            <option value="WARN">WARN</option>
          </select>
        </div>

        {/* Log Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Time', 'Event', 'Action', 'Verdict', 'Reasoning'].map(h => (
                  <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditLog.map(entry => (
                <tr key={entry.id} style={{ borderBottom: '1px solid hsla(0,0%,100%,0.04)' }}>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'hsla(var(--accent-h, 270), 70%, 50%, 0.15)', color: 'var(--accent)' }}>
                      {entry.event_type}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-primary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.action}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <span style={{
                      fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600,
                      background: `${VERDICT_COLORS[entry.verdict] || '#666'}22`,
                      color: VERDICT_COLORS[entry.verdict] || '#666',
                    }}>
                      {entry.verdict}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.reasoning || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
