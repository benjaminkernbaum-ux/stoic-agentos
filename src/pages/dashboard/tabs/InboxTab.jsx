import { useState, useMemo } from 'react';

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const DEMO_MESSAGES = [
  { id: 1, agent: 'code-reviewer', icon: '🤖', title: 'PR #142 review complete', body: 'Found 2 issues in authentication module — memory leak in session handler and missing input validation on /api/v1/agents endpoint.', priority: 'high', read: false, ts: Date.now() - 300000 },
  { id: 2, agent: 'data-pipeline', icon: '📊', title: 'Batch processing finished', body: '15,420 records processed with 99.1% accuracy. 3 records flagged for manual review.', priority: 'normal', read: false, ts: Date.now() - 1800000 },
  { id: 3, agent: 'slack-responder', icon: '💬', title: 'Slack thread summarized', body: 'Key decisions from #engineering: Deploy to staging by Friday, switch to connection pooling, and schedule load test for Q3 release.', priority: 'normal', read: true, ts: Date.now() - 7200000 },
  { id: 4, agent: 'ci-monitor', icon: '🚀', title: 'Deploy succeeded — v2.4.1', body: 'Production deploy completed in 3m 42s. All health checks passing. Zero-downtime rollout confirmed.', priority: 'low', read: true, ts: Date.now() - 14400000 },
  { id: 5, agent: 'research-agent', icon: '🔍', title: 'Market research report ready', body: 'Analyzed 47 competitor products. Full report with pricing comparison and feature matrix available.', priority: 'normal', read: true, ts: Date.now() - 86400000 },
];

const PRIORITY_COLORS = {
  high: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'High' },
  normal: { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa', label: 'Normal' },
  low: { bg: 'rgba(113,113,122,0.12)', color: '#71717a', label: 'Low' },
};

export default function InboxTab() {
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [filter, setFilter] = useState('all'); // all, unread, high
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = messages;
    if (filter === 'unread') result = result.filter(m => !m.read);
    if (filter === 'high') result = result.filter(m => m.priority === 'high');
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.agent.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q)
      );
    }
    return result;
  }, [messages, filter, search]);

  const selected = messages.find(m => m.id === selectedId);
  const unreadCount = messages.filter(m => !m.read).length;

  const markRead = (id) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
    setSelectedId(id);
  };

  const markAllRead = () => {
    setMessages(prev => prev.map(m => ({ ...m, read: true })));
  };

  return (
    <div className="dash-content fleet-inbox-layout">
      {/* Message list */}
      <div className="fleet-inbox-list">
        <div className="fleet-inbox-list-header">
          <h3 className="fleet-inbox-title">
            📬 Inbox
            {unreadCount > 0 && <span className="fleet-inbox-badge">{unreadCount}</span>}
          </h3>
          <button className="fleet-inbox-mark-all" onClick={markAllRead}>Mark all read</button>
        </div>

        {/* Filters */}
        <div className="fleet-inbox-filters">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'high', label: '🔴 High' },
          ].map(f => (
            <button
              key={f.id}
              className={`fleet-inbox-filter ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >{f.label}</button>
          ))}
        </div>

        <input
          className="fleet-inbox-search"
          placeholder="Search messages..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="fleet-inbox-items">
          {filtered.length === 0 ? (
            <div className="fleet-inbox-empty">
              <span style={{ fontSize: 32 }}>📭</span>
              <p>No messages</p>
            </div>
          ) : (
            filtered.map(msg => (
              <div
                key={msg.id}
                className={`fleet-inbox-item ${msg.id === selectedId ? 'selected' : ''} ${!msg.read ? 'unread' : ''}`}
                onClick={() => markRead(msg.id)}
              >
                <div className="fleet-inbox-item-icon">{msg.icon}</div>
                <div className="fleet-inbox-item-body">
                  <div className="fleet-inbox-item-top">
                    <span className="fleet-inbox-item-agent">{msg.agent}</span>
                    <span className="fleet-inbox-item-time">{timeAgo(msg.ts)}</span>
                  </div>
                  <div className="fleet-inbox-item-title">{msg.title}</div>
                  <div className="fleet-inbox-item-preview">{msg.body.slice(0, 80)}...</div>
                </div>
                {!msg.read && <div className="fleet-inbox-unread-dot" />}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail pane */}
      <div className="fleet-inbox-detail">
        {selected ? (
          <>
            <div className="fleet-inbox-detail-header">
              <span className="fleet-inbox-detail-icon">{selected.icon}</span>
              <div>
                <h3 className="fleet-inbox-detail-title">{selected.title}</h3>
                <div className="fleet-inbox-detail-meta">
                  <span className="fleet-inbox-detail-agent">{selected.agent}</span>
                  <span
                    className="fleet-inbox-priority-badge"
                    style={{ background: PRIORITY_COLORS[selected.priority].bg, color: PRIORITY_COLORS[selected.priority].color }}
                  >{PRIORITY_COLORS[selected.priority].label}</span>
                  <span className="fleet-inbox-detail-time">{timeAgo(selected.ts)}</span>
                </div>
              </div>
            </div>
            <div className="fleet-inbox-detail-body">
              <p>{selected.body}</p>
            </div>
          </>
        ) : (
          <div className="fleet-inbox-detail-empty">
            <span style={{ fontSize: 48 }}>📬</span>
            <h3>Select a message</h3>
            <p>Choose a message from the inbox to view its details</p>
          </div>
        )}
      </div>
    </div>
  );
}
