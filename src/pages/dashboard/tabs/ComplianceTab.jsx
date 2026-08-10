import { useState, useEffect, useCallback } from 'react';
import { supabase, API_BASE } from '../../../lib/supabase';

const VERDICT_COLORS = { PROCEED: '#22c55e', BLOCK: '#ef4444', WARN: '#eab308', ESCALATE: '#38bdf8' };
const CIRCUIT_COLORS = { closed: '#22c55e', 'half-open': '#eab308', open: '#ef4444' };
const CIRCUIT_LABELS = { closed: 'Healthy', 'half-open': 'Warning', open: 'Tripped' };
const POLICY_ACTION_COLORS = { ALLOW: '#22c55e', REQUIRE_APPROVAL: '#38bdf8', BLOCK: '#ef4444' };
const EMPTY_POLICY_FORM = { name: '', tool_pattern: '', action: 'REQUIRE_APPROVAL', timeout_seconds: 300 };

export default function ComplianceTab() {
  const [auditLog, setAuditLog] = useState([]);
  const [stats, setStats] = useState({ total: 0, by_type: {}, by_verdict: {}, by_day: {} });
  const [breakers, setBreakers] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [policyForm, setPolicyForm] = useState(EMPTY_POLICY_FORM);
  const [policyMsg, setPolicyMsg] = useState('');
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [resolveMsg, setResolveMsg] = useState('');
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
      let logUrl = `${API_BASE}/api/v1/compliance/audit-log`;
      const params = new URLSearchParams();
      if (filters.event_type) params.set('event_type', filters.event_type);
      if (filters.verdict) params.set('verdict', filters.verdict);
      if (params.toString()) logUrl += `?${params}`;

      const [logR, statsR, breakerR, approvalsR, policiesR] = await Promise.all([
        fetch(logUrl, { headers: h }).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/v1/compliance/audit-log/stats`, { headers: h }).then(r => r.json()).catch(() => ({ total: 0, by_type: {}, by_verdict: {}, by_day: {} })),
        fetch(`${API_BASE}/api/v1/compliance/circuit-breaker`, { headers: h }).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/v1/compliance/shield/approvals?status=PENDING`, { headers: h }).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/v1/compliance/shield/policies`, { headers: h }).then(r => r.json()).catch(() => []),
      ]);
      setAuditLog(Array.isArray(logR) ? logR : []);
      setStats(statsR);
      setBreakers(Array.isArray(breakerR) ? breakerR : []);
      setApprovals(Array.isArray(approvalsR) ? approvalsR : []);
      setPolicies(Array.isArray(policiesR) ? policiesR : []);
    } catch { /* silently degrade */ }
    setLoading(false);
  }, [headers, filters]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => {
      headers().then(h => {
        fetch(`${API_BASE}/api/v1/compliance/shield/approvals?status=PENDING`, { headers: h })
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data)) setApprovals(data);
          })
          .catch(() => {});
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchAll, headers]);

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
      await Promise.all(entries.map(e => fetch(`${API_BASE}/api/v1/compliance/audit-log`, { method: 'POST', headers: h, body: JSON.stringify(e) })));
      await fetchAll();
    } catch { /* ignore */ }
    setSeeding(false);
  };

  const exportSIEM = async () => {
    try {
      const h = await headers();
      const res = await fetch(`${API_BASE}/api/v1/compliance/audit-log/export`, { headers: h });
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

  const resolveApproval = async (id, verdict) => {
    try {
      const h = await headers();
      const res = await fetch(`${API_BASE}/api/v1/compliance/shield/approvals/${id}/resolve`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ verdict }),
      });
      if (res.ok) {
        setResolveMsg('');
        fetchAll();
      } else if (res.status === 409) {
        // CAS conflict: another admin resolved it first, or it timed out
        setResolveMsg('This approval was already resolved (or timed out) by someone else — refreshing.');
        setTimeout(() => setResolveMsg(''), 5000);
        fetchAll();
      }
    } catch (err) {
      console.error('[compliance] Error resolving approval:', err);
    }
  };

  const createPolicy = async () => {
    if (!policyForm.name.trim() || !policyForm.tool_pattern.trim()) {
      setPolicyMsg('Name and tool pattern are required.');
      return;
    }
    setSavingPolicy(true);
    setPolicyMsg('');
    try {
      const h = await headers();
      const res = await fetch(`${API_BASE}/api/v1/compliance/shield/policies`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
          name: policyForm.name.trim(),
          tool_pattern: policyForm.tool_pattern.trim(),
          action: policyForm.action,
          timeout_seconds: Number(policyForm.timeout_seconds) || 300,
        }),
      });
      if (res.ok) {
        setPolicyForm(EMPTY_POLICY_FORM);
        fetchAll();
      } else {
        const err = await res.json().catch(() => ({}));
        setPolicyMsg(err.error || 'Failed to create policy.');
      }
    } catch {
      setPolicyMsg('Failed to create policy.');
    }
    setSavingPolicy(false);
  };

  const togglePolicy = async (policy) => {
    try {
      const h = await headers();
      await fetch(`${API_BASE}/api/v1/compliance/shield/policies/${policy.id}`, {
        method: 'PATCH',
        headers: h,
        body: JSON.stringify({ enabled: !policy.enabled }),
      });
      fetchAll();
    } catch { /* ignore */ }
  };

  const deletePolicy = async (policyId) => {
    try {
      const h = await headers();
      await fetch(`${API_BASE}/api/v1/compliance/shield/policies/${policyId}`, {
        method: 'DELETE',
        headers: h,
      });
      fetchAll();
    } catch { /* ignore */ }
  };

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const h = await headers();
      const res = await fetch(`${API_BASE}/api/v1/compliance/report`, { headers: h });
      if (res.ok) setReport(await res.json());
    } catch { /* ignore */ }
    setReportLoading(false);
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `governance_report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isEmpty = stats.total === 0 && approvals.length === 0 && policies.length === 0 && !loading;

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

      {resolveMsg && (
        <div style={{
          marginBottom: '1rem', padding: '0.6rem 1rem', borderRadius: '8px',
          background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.4)',
          color: '#eab308', fontSize: '0.85rem'
        }}>
          ⚠️ {resolveMsg}
        </div>
      )}

      {/* Pending Approvals (HITL) */}
      {approvals.length > 0 && (
        <div className="dash-card" style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1px solid var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🛡️</span>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Pending Human-in-the-Loop Approvals</h3>
            <span style={{
              fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px',
              background: 'var(--accent)', color: '#fff', fontWeight: 600,
              animation: 'pulse 1.5s infinite'
            }}>
              {approvals.length} ACTION{approvals.length > 1 ? 'S' : ''} AWAITING
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {approvals.map(app => (
              <div key={app.id} style={{
                padding: '1rem', borderRadius: '8px', background: 'var(--surface-1)',
                border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem'
              }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Tool:</span>
                    <code style={{ background: 'hsla(0,0%,100%,0.08)', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent)', fontSize: '0.85rem' }}>
                      {app.tool_name}
                    </code>
                    {app.agent_id && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        (Agent: {app.agent_id.slice(0, 8)})
                      </span>
                    )}
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <strong>Arguments:</strong>
                    <pre style={{
                      margin: '0.25rem 0 0', padding: '0.5rem', borderRadius: '4px',
                      background: 'hsla(0,0%,0%,0.2)', fontSize: '0.75rem', overflowX: 'auto',
                      maxHeight: '120px', border: '1px solid hsla(0,0%,100%,0.04)'
                    }}>
                      {JSON.stringify(app.tool_args, null, 2)}
                    </pre>
                  </div>
                  
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Requested at: {new Date(app.created_at).toLocaleString()}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'center' }}>
                  <button className="dash-btn" 
                    onClick={() => resolveApproval(app.id, 'APPROVED')}
                    style={{
                      background: '#22c55e', color: '#fff', border: 'none',
                      fontWeight: 600, padding: '0.5rem 1rem', fontSize: '0.8rem'
                    }}>
                    ✅ Approve
                  </button>
                  <button className="dash-btn"
                    onClick={() => resolveApproval(app.id, 'REJECTED')}
                    style={{
                      background: '#ef4444', color: '#fff', border: 'none',
                      fontWeight: 600, padding: '0.5rem 1rem', fontSize: '0.8rem'
                    }}>
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shield Policies (declarative, server-enforced) */}
      <div className="dash-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>🛡️ Shield Policies</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {policies.filter(p => p.enabled).length} active / {policies.length} total
          </span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
          Server-enforced rules matched against every tool call your agents make.
          Glob patterns: <code>stripe_*</code>, <code>*_delete</code>, <code>send_email</code>.
        </p>

        {policies.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {policies.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                padding: '0.6rem 0.75rem', borderRadius: '8px',
                background: 'var(--surface-1)', border: '1px solid var(--border)',
                opacity: p.enabled ? 1 : 0.5,
              }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{p.name}</span>
                <code style={{ background: 'hsla(0,0%,100%,0.08)', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent)', fontSize: '0.78rem' }}>
                  {p.tool_pattern}
                </code>
                <span style={{
                  fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600,
                  background: `${POLICY_ACTION_COLORS[p.action] || '#666'}22`,
                  color: POLICY_ACTION_COLORS[p.action] || '#666',
                }}>
                  {p.action}
                </span>
                {p.action === 'REQUIRE_APPROVAL' && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    timeout {p.timeout_seconds}s
                  </span>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                  <button className="dash-btn" onClick={() => togglePolicy(p)}
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}>
                    {p.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button className="dash-btn" onClick={() => deletePolicy(p.id)}
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', color: '#ef4444' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create policy */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={policyForm.name} placeholder="Policy name"
            onChange={e => setPolicyForm(f => ({ ...f, name: e.target.value }))}
            style={{ flex: '1 1 140px', padding: '0.45rem 0.7rem', borderRadius: '6px', background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '0.8rem' }} />
          <input value={policyForm.tool_pattern} placeholder="Tool pattern (e.g. stripe_*)"
            onChange={e => setPolicyForm(f => ({ ...f, tool_pattern: e.target.value }))}
            style={{ flex: '1 1 160px', padding: '0.45rem 0.7rem', borderRadius: '6px', background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '0.8rem', fontFamily: 'monospace' }} />
          <select value={policyForm.action}
            onChange={e => setPolicyForm(f => ({ ...f, action: e.target.value }))}
            style={{ padding: '0.45rem 0.7rem', borderRadius: '6px', background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
            <option value="REQUIRE_APPROVAL">Require approval</option>
            <option value="BLOCK">Block</option>
            <option value="ALLOW">Allow</option>
          </select>
          {policyForm.action === 'REQUIRE_APPROVAL' && (
            <input type="number" value={policyForm.timeout_seconds} min={10} max={86400}
              onChange={e => setPolicyForm(f => ({ ...f, timeout_seconds: e.target.value }))}
              title="Approval timeout (seconds)"
              style={{ width: '90px', padding: '0.45rem 0.7rem', borderRadius: '6px', background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '0.8rem' }} />
          )}
          <button className="dash-btn dash-btn-primary" onClick={createPolicy} disabled={savingPolicy}
            style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}>
            {savingPolicy ? 'Saving…' : '+ Add Policy'}
          </button>
        </div>
        {policyMsg && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#ef4444' }}>{policyMsg}</div>
        )}
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

      {/* Governance Report */}
      <div className="dash-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>📊 Governance Report</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
              Last 30 days: actions taken, approvals required, blocks enforced — the artifact you hand to a client or auditor.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="dash-btn dash-btn-primary" onClick={generateReport} disabled={reportLoading}
              style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}>
              {reportLoading ? 'Generating…' : report ? '↻ Refresh' : 'Generate'}
            </button>
            {report && (
              <button className="dash-btn" onClick={downloadReport} style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}>
                📥 Download JSON
              </button>
            )}
          </div>
        </div>

        {report && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: 'Total Events', value: report.audit?.total_events ?? 0, color: 'var(--text-primary)' },
                { label: 'Approvals Requested', value: report.approvals?.total_requested ?? 0, color: '#38bdf8' },
                { label: 'Approved', value: (report.approvals?.by_status?.APPROVED ?? 0) + (report.approvals?.by_status?.CONSUMED ?? 0), color: '#22c55e' },
                { label: 'Rejected', value: report.approvals?.by_status?.REJECTED ?? 0, color: '#ef4444' },
                { label: 'Timed Out', value: report.approvals?.by_status?.TIMEOUT ?? 0, color: '#eab308' },
                { label: 'Blocks Enforced', value: report.audit?.by_verdict?.BLOCK ?? 0, color: '#ef4444' },
                {
                  label: 'Median Resolution',
                  value: report.approvals?.median_resolution_seconds != null
                    ? `${Math.round(report.approvals.median_resolution_seconds)}s` : '—',
                  color: 'var(--accent)'
                },
                { label: 'Active Policies', value: report.policies?.enabled ?? 0, color: 'var(--accent)' },
              ].map(card => (
                <div key={card.label} style={{
                  padding: '0.75rem', borderRadius: '8px', textAlign: 'center',
                  background: 'var(--surface-1)', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: card.color }}>{card.value}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{card.label}</div>
                </div>
              ))}
            </div>
            {Array.isArray(report.agents) && report.agents.length > 0 && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Most active: {report.agents.slice(0, 3).map(a =>
                  `${a.agent_name || a.agent_id.slice(0, 8)} (${a.events} events, ${a.blocks} blocks)`
                ).join(' · ')}
              </div>
            )}
          </div>
        )}
      </div>

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
