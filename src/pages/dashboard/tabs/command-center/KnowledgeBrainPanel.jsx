import { useState } from 'react';
import { colors, shared } from './styles';

const TYPES = {
  note:         { icon: '📝', label: 'Note',         color: '#a78bfa' },
  decision:     { icon: '🎯', label: 'Decision',     color: '#3b82f6' },
  discovery:    { icon: '🔬', label: 'Discovery',    color: '#f59e0b' },
  architecture: { icon: '🏗️', label: 'Architecture', color: '#10b981' },
  error:        { icon: '⚠️', label: 'Error',        color: '#ef4444' },
  concept:      { icon: '💡', label: 'Concept',      color: '#06b6d4' },
  default:      { icon: '🧠', label: 'Insight',      color: '#6b7280' },
};

const STATUS_LIFECYCLE = {
  seed:       { label: '🌱 Seed',       color: '#a3e635' },
  developing: { label: '🌿 Developing', color: '#22d3ee' },
  mature:     { label: '🌳 Mature',     color: '#10b981' },
  evergreen:  { label: '♾️ Evergreen',  color: '#a78bfa' },
};

const FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'concept',   label: '💡 Concepts' },
  { key: 'decision',  label: '🎯 Decisions' },
  { key: 'discovery', label: '🔬 Discoveries' },
  { key: 'note',      label: '📝 Notes' },
  { key: 'error',     label: '⚠️ Errors' },
];

const getType = (t) => TYPES[t] || TYPES.default;

const getStatus = (created) => {
  if (!created) return STATUS_LIFECYCLE.seed;
  const days = (Date.now() - new Date(created).getTime()) / 86400000;
  if (days < 1) return STATUS_LIFECYCLE.seed;
  if (days < 7) return STATUS_LIFECYCLE.developing;
  if (days < 30) return STATUS_LIFECYCLE.mature;
  return STATUS_LIFECYCLE.evergreen;
};

const timeAgo = (date) => {
  if (!date) return '—';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function KnowledgeBrainPanel({ knowledgeItems = [], observations = [] }) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [hovered, setHovered] = useState(null);

  const allItems = [
    ...knowledgeItems.map(ki => ({
      id: ki.id, name: ki.name || ki.title || 'Knowledge Item',
      type: ki.type || 'concept', content: ki.summary || ki.content || '',
      created: ki.created_at,
    })),
    ...observations.map(obs => ({
      id: obs.id, name: obs.title || 'Observation',
      type: obs.type || 'note', content: obs.content || '',
      created: obs.created_at,
    })),
  ];

  const filtered = allItems.filter(item => {
    const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.content.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const recent = observations.slice(0, 5);
  const activeTopics = [...new Set(recent.map(o => o.title || o.type).filter(Boolean))].slice(0, 4);
  const lastActivity = recent[0]?.created_at;
  const pendingCount = observations.filter(o => o.type === 'error' || o.type === 'decision').length;

  // ── Layer 1: Hot Cache ──
  const hotCache = (
    <div style={{
      ...shared.card, padding: 28, marginBottom: 24,
      borderLeft: '4px solid transparent',
      borderImage: 'linear-gradient(180deg, #7c3aed 0%, #4d7cff 100%) 1',
      borderImageSlice: 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%', background: colors.obPurple,
          boxShadow: `0 0 8px ${colors.obPurple}`, display: 'inline-block',
          animation: 'pulse 2s infinite',
        }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, letterSpacing: -0.3 }}>
          Recent Context
        </span>
        <span style={{ fontSize: 11, color: colors.textDim, marginLeft: 'auto' }}>
          Last activity: {timeAgo(lastActivity)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={shared.label}>Active Topics</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {activeTopics.length > 0 ? activeTopics.map((t, i) => (
              <span key={i} style={shared.tag('rgba(124,58,237,0.15)', colors.obPurple)}>{t}</span>
            )) : <span style={{ fontSize: 12, color: colors.textDim }}>No recent topics</span>}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={shared.label}>Pending</div>
          <span style={{
            fontSize: 22, fontWeight: 800, color: pendingCount > 0 ? colors.accentOrange : colors.accentGreen,
          }}>{pendingCount}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={shared.label}>Total Items</div>
          <span style={{ fontSize: 22, fontWeight: 800, color: colors.accentBlue }}>{allItems.length}</span>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );

  // ── Layer 2: Filters + Search ──
  const filterBar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
      {FILTERS.map(f => {
        const active = activeFilter === f.key;
        return (
          <button key={f.key} onClick={() => setActiveFilter(f.key)} style={{
            padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${active ? colors.obPurple : colors.border}`,
            background: active ? 'rgba(124,58,237,0.18)' : colors.bgCard,
            color: active ? colors.obViolet : colors.textSecondary,
            boxShadow: active ? `0 0 14px ${colors.obPurple}33` : 'none',
            transition: 'all 0.25s',
          }}>
            {f.label}
          </button>
        );
      })}
      <div style={{ position: 'relative', flex: 1, minWidth: 180, marginLeft: 'auto' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: colors.textDim }}>🔍</span>
        <input
          type="text" placeholder="Search knowledge…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '9px 14px 9px 36px', background: colors.bgCard,
            border: `1px solid ${colors.border}`, borderRadius: 12, color: colors.textPrimary,
            fontSize: 13, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = colors.obPurple; }}
          onBlur={e => { e.currentTarget.style.borderColor = colors.border; }}
        />
      </div>
      <span style={{
        padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
        background: 'rgba(168,85,247,0.12)', color: colors.obViolet, whiteSpace: 'nowrap',
      }}>
        {filtered.length} item{filtered.length !== 1 ? 's' : ''}
      </span>
    </div>
  );

  // ── Layer 3: Knowledge Cards ──
  const emptyState = (
    <div style={{ textAlign: 'center', padding: '72px 20px', color: colors.textDim }}>
      <div style={{ fontSize: 56, marginBottom: 18, filter: 'grayscale(0.3)' }}>🧠</div>
      <h3 style={{ color: colors.textSecondary, fontWeight: 700, marginBottom: 8, fontSize: 16 }}>
        Your knowledge brain is empty
      </h3>
      <p style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 380, margin: '0 auto' }}>
        Capture observations to start building compound intelligence.
      </p>
    </div>
  );

  const cardGrid = (
    <div style={shared.grid(320)}>
      {filtered.map((item, i) => {
        const t = getType(item.type);
        const status = getStatus(item.created);
        const isHovered = hovered === i;
        return (
          <div
            key={item.id ?? i}
            style={{
              background: colors.bgCard, borderRadius: 14, padding: 20,
              borderLeft: `4px solid ${t.color}`,
              border: `1px solid ${isHovered ? t.color + '88' : colors.border}`,
              borderLeftWidth: 4, borderLeftColor: t.color, borderLeftStyle: 'solid',
              boxShadow: isHovered ? `0 4px 24px ${t.color}18` : 'none',
              transform: isHovered ? 'translateY(-2px)' : 'none',
              transition: 'all 0.25s', cursor: 'default',
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>{t.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: 14, color: colors.textPrimary,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{item.name}</div>
              </div>
              <span style={{
                padding: '2px 9px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                background: `${t.color}18`, color: t.color, textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}>{t.label}</span>
            </div>
            <div style={{
              fontSize: 12, color: colors.textSecondary, lineHeight: 1.6,
              marginBottom: 14, minHeight: 38,
            }}>
              {item.content.length > 200 ? item.content.slice(0, 200) + '…' : item.content || 'No content'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                padding: '3px 10px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                background: `${status.color}18`, color: status.color, letterSpacing: 0.3,
              }}>{status.label}</span>
              <span style={{ fontSize: 10, color: colors.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                {item.created ? new Date(item.created).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          🧠 Knowledge Brain <span style={shared.badge}>Three-Layer Architecture</span>
        </div>
      </div>
      {hotCache}
      {filterBar}
      {filtered.length === 0 ? emptyState : cardGrid}
    </div>
  );
}
