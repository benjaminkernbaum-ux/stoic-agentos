import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase, API_BASE } from '../../../lib/supabase';

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function timeBucket(ts) {
  const hours = (Date.now() - ts) / 3600000;
  if (hours < 1) return 'Now';
  if (hours < 6) return 'Earlier';
  if (hours < 24) return 'Today';
  if (hours < 48) return 'Yesterday';
  return 'Older';
}

const DEMO_SIGNALS = [
  { id: 1, agent: 'code-reviewer', icon: '🔍', type: 'alert', title: 'PR #142 — 2 issues found', body: 'Memory leak in session handler and missing input validation on /api/v1/agents endpoint. Auto-fix available.', priority: 'high', read: false, ts: Date.now() - 300000, action: 'Review Fix' },
  { id: 2, agent: 'data-pipeline', icon: '📊', type: 'report', title: 'Batch processing complete', body: '15,420 records processed with 99.1% accuracy. 3 records flagged for manual review. Pipeline duration: 4m 12s.', priority: 'normal', read: false, ts: Date.now() - 1800000, action: 'View Report' },
  { id: 3, agent: 'slack-responder', icon: '💬', type: 'digest', title: 'Slack digest — #engineering', body: 'Key decisions: Deploy to staging by Friday, switch to connection pooling, schedule load test for Q3. 14 threads summarized.', priority: 'normal', read: true, ts: Date.now() - 7200000, action: 'Read Full' },
  { id: 4, agent: 'ci-monitor', icon: '🚀', type: 'success', title: 'Deploy v2.4.1 — All green', body: 'Production deploy completed in 3m 42s. Health checks: 12/12 passing. Zero-downtime rollout confirmed.', priority: 'low', read: true, ts: Date.now() - 14400000, action: null },
  { id: 5, agent: 'security-scan', icon: '🛡️', type: 'alert', title: 'Dependency vulnerability detected', body: 'CVE-2026-1234 found in lodash@4.17.20. Severity: Medium. Auto-upgrade available to 4.17.25.', priority: 'high', read: true, ts: Date.now() - 28800000, action: 'Auto-Fix' },
  { id: 6, agent: 'research-agent', icon: '🔬', type: 'report', title: 'Market research report ready', body: 'Analyzed 47 competitor products across 6 dimensions. Full report with pricing comparison and feature matrix.', priority: 'normal', read: true, ts: Date.now() - 86400000, action: 'Download' },
];

const TYPE_ICONS = { alert: '⚠️', report: '📄', digest: '📋', success: '✓' };

const TYPE_STYLES = {
  alert:   { border: '#ef4444', bg: 'rgba(239,68,68,0.06)', icon: '⚠️' },
  report:  { border: '#a78bfa', bg: 'rgba(167,139,250,0.06)', icon: '📄' },
  digest:  { border: '#60a5fa', bg: 'rgba(96,165,250,0.06)', icon: '📋' },
  success: { border: '#22c55e', bg: 'rgba(34,197,94,0.06)', icon: '✓' },
};

/** Transform a backend alert_event into the signal shape the UI expects. */
function eventToSignal(ev) {
  const ruleName = ev.alert_rules?.name || '';
  const ruleType = ev.alert_rules?.type || 'alert';
  const payload = ev.payload || {};
  return {
    id: ev.id,
    agent: payload.agent || ruleName || 'system',
    icon: payload.icon || TYPE_ICONS[ruleType] || '📡',
    type: ruleType,
    title: payload.title || ev.message || ruleName,
    body: payload.body || ev.message || '',
    priority: payload.priority || (ruleType === 'alert' ? 'high' : 'normal'),
    read: !!ev.acknowledged,
    ts: new Date(ev.created_at).getTime(),
    action: payload.action || null,
  };
}

async function getAuthHeaders() {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function InboxTab({ org }) {
  const [signals, setSignals] = useState(DEMO_SIGNALS);
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  // Fetch real alerts on mount
  const fetchAlerts = useCallback(async () => {
    if (!org?.id) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/v1/alerts?org_id=${org.id}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { events } = await res.json();
      if (events && events.length > 0) {
        setSignals(events.map(eventToSignal));
      }
      // If no events, keep DEMO_SIGNALS (already set as initial state)
    } catch {
      // Fetch failed — keep DEMO_SIGNALS fallback
    }
  }, [org?.id]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const filtered = useMemo(() => {
    let result = signals;
    if (filter === 'unread') result = result.filter(m => !m.read);
    if (filter === 'alerts') result = result.filter(m => m.type === 'alert');
    if (filter === 'reports') result = result.filter(m => m.type === 'report');
    return result;
  }, [signals, filter]);

  // Group by time bucket
  const grouped = useMemo(() => {
    const buckets = {};
    for (const sig of filtered) {
      const bucket = timeBucket(sig.ts);
      if (!buckets[bucket]) buckets[bucket] = [];
      buckets[bucket].push(sig);
    }
    return Object.entries(buckets);
  }, [filtered]);

  const selected = signals.find(m => m.id === selectedId);
  const unreadCount = signals.filter(m => !m.read).length;
  const alertCount = signals.filter(m => m.type === 'alert' && !m.read).length;

  const markRead = async (id) => {
    setSignals(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
    setSelectedId(id);
    // Acknowledge on the backend (fire-and-forget)
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/api/v1/alerts/events/${id}`, { method: 'PATCH', headers });
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    setSignals(prev => prev.map(m => ({ ...m, read: true })));
    // Acknowledge all on the backend
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/api/v1/alerts/events/acknowledge-all`, { method: 'POST', headers });
    } catch { /* ignore */ }
  };

  return (
    <div className="dash-content signal-layout">
      {/* Signal feed */}
      <div className="signal-feed">
        <div className="signal-feed-header">
          <h3 className="signal-feed-title">
            📡 Signal Feed
            {unreadCount > 0 && <span className="signal-badge">{unreadCount}</span>}
            {alertCount > 0 && <span className="signal-badge alert">⚠ {alertCount}</span>}
          </h3>
          <button className="signal-mark-all" onClick={markAllRead}>Clear all</button>
        </div>

        <div className="signal-filters">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'alerts', label: '⚠️ Alerts' },
            { id: 'reports', label: '📄 Reports' },
          ].map(f => (
            <button
              key={f.id}
              className={`signal-filter ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >{f.label}</button>
          ))}
        </div>

        <div className="signal-timeline">
          {grouped.length === 0 ? (
            <div className="signal-empty">
              <span style={{ fontSize: 36 }}>📡</span>
              <p>No signals matching filter</p>
            </div>
          ) : (
            grouped.map(([bucket, sigs]) => (
              <div key={bucket} className="signal-bucket">
                <div className="signal-bucket-label">{bucket}</div>
                {sigs.map(sig => {
                  const style = TYPE_STYLES[sig.type] || TYPE_STYLES.report;
                  return (
                    <div
                      key={sig.id}
                      className={`signal-item ${sig.id === selectedId ? 'selected' : ''} ${!sig.read ? 'unread' : ''}`}
                      style={{ borderLeftColor: style.border, background: sig.id === selectedId ? style.bg : undefined }}
                      onClick={() => markRead(sig.id)}
                    >
                      <div className="signal-item-icon">{sig.icon}</div>
                      <div className="signal-item-body">
                        <div className="signal-item-header">
                          <span className="signal-item-agent">{sig.agent}</span>
                          <span className="signal-item-type" style={{ color: style.border }}>{style.icon} {sig.type}</span>
                          <span className="signal-item-time">{timeAgo(sig.ts)}</span>
                        </div>
                        <div className="signal-item-title">{sig.title}</div>
                        <div className="signal-item-preview">{sig.body.slice(0, 90)}...</div>
                      </div>
                      {!sig.read && <div className="signal-unread-pulse" />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail pane */}
      <div className="signal-detail">
        {selected ? (
          <>
            <div className="signal-detail-header">
              <div className="signal-detail-icon-wrap" style={{ background: TYPE_STYLES[selected.type]?.bg }}>
                <span className="signal-detail-icon">{selected.icon}</span>
              </div>
              <div className="signal-detail-info">
                <h3 className="signal-detail-title">{selected.title}</h3>
                <div className="signal-detail-meta">
                  <span className="signal-detail-agent">🤖 {selected.agent}</span>
                  <span className="signal-detail-type" style={{ color: TYPE_STYLES[selected.type]?.border }}>
                    {TYPE_STYLES[selected.type]?.icon} {selected.type}
                  </span>
                  <span className="signal-detail-time">{timeAgo(selected.ts)}</span>
                </div>
              </div>
            </div>
            <div className="signal-detail-body">
              <p>{selected.body}</p>
            </div>
            {selected.action && (
              <div className="signal-detail-actions">
                <button className="signal-action-btn primary">{selected.action}</button>
                <button className="signal-action-btn">Dismiss</button>
                <button className="signal-action-btn">Reply to Agent</button>
              </div>
            )}
          </>
        ) : (
          <div className="signal-detail-empty">
            <div className="signal-detail-empty-icon">📡</div>
            <h3>Select a signal</h3>
            <p>Choose an agent signal from the feed to inspect details and take action</p>
          </div>
        )}
      </div>
    </div>
  );
}
