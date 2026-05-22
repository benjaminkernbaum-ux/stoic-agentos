import { useState } from 'react';
import { colors, shared } from './styles';

const styles = {
  searchBar: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
  },
  searchInput: {
    flex: 1, padding: '10px 16px 10px 40px',
    background: colors.bgCard, border: `1px solid ${colors.border}`,
    borderRadius: 12, color: colors.textPrimary,
    fontFamily: "'Inter', sans-serif", fontSize: 13, outline: 'none',
    transition: 'border-color 0.2s',
  },
  searchIcon: {
    position: 'absolute', left: 14, fontSize: 14, color: colors.textDim,
  },
  countBadge: {
    background: 'rgba(167,139,250,0.15)', color: '#a78bfa',
    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
  },
  kiCard: (color, isHovered) => ({
    background: colors.bgCard,
    border: `1px solid ${isHovered ? color : colors.border}`,
    borderRadius: 12, padding: 18, transition: 'all 0.2s',
    cursor: 'default', borderLeft: `4px solid ${color}`,
    boxShadow: isHovered ? `0 0 20px ${color}22` : 'none',
  }),
  kiHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  kiIcon: { fontSize: 24 },
  kiName: { fontWeight: 700, fontSize: 14, color: colors.textPrimary },
  kiId: (color) => ({ fontSize: 11, color, fontFamily: "'JetBrains Mono', monospace" }),
  kiDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 1.5, marginBottom: 12 },
  typeBadge: (color) => ({
    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
    background: `${color}18`, color, textTransform: 'uppercase',
  }),
  dateBadge: { fontSize: 10, color: colors.textDim, fontFamily: "'JetBrains Mono', monospace" },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: colors.textDim },
};

const TYPE_COLORS = {
  note: '#a78bfa', decision: '#3b82f6', architecture: '#10b981',
  deployment: '#ef4444', discovery: '#f59e0b', error: '#ef4444',
  default: '#6b7280',
};

export default function KnowledgeBrainPanel({ knowledgeItems = [], observations = [] }) {
  const [search, setSearch] = useState('');
  const [hovered, setHovered] = useState(null);

  // Combine knowledge items and observations as brain items
  const allItems = [
    ...knowledgeItems.map(ki => ({
      id: ki.id, icon: '💡', name: ki.name || ki.title || 'Knowledge Item',
      color: '#a78bfa', desc: ki.summary || ki.content || '',
      type: 'knowledge', created: ki.created_at,
    })),
    ...observations.slice(0, 20).map(obs => ({
      id: obs.id, icon: '🧠', name: obs.title || 'Observation',
      color: TYPE_COLORS[obs.type] || TYPE_COLORS.default,
      desc: obs.content || '', type: obs.type || 'note',
      created: obs.created_at,
    })),
  ];

  const filtered = allItems.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          🧠 Knowledge Brain{' '}
          <span style={shared.badge}>Your Knowledge Items</span>
        </div>
      </div>

      {/* Search */}
      <div style={styles.searchBar}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search knowledge items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={styles.searchInput}
            onFocus={e => { e.currentTarget.style.borderColor = '#a855f7'; }}
            onBlur={e => { e.currentTarget.style.borderColor = colors.border; }}
          />
        </div>
        <span style={styles.countBadge}>{filtered.length} items</span>
      </div>

      {/* Items Grid */}
      {filtered.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
          <h3 style={{ color: colors.textSecondary, marginBottom: 8 }}>No knowledge items yet</h3>
          <p>Capture observations and knowledge items to build your brain.</p>
        </div>
      ) : (
        <div style={shared.grid(340)}>
          {filtered.map((ki, i) => (
            <div
              key={ki.id}
              style={styles.kiCard(ki.color, hovered === i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div style={styles.kiHeader}>
                <div style={styles.kiIcon}>{ki.icon}</div>
                <div>
                  <div style={styles.kiName}>{ki.name}</div>
                  <div style={styles.kiId(ki.color)}>{ki.type}</div>
                </div>
              </div>
              <div style={styles.kiDesc}>{ki.desc.substring(0, 200)}{ki.desc.length > 200 ? '...' : ''}</div>
              <div style={styles.footer}>
                <span style={styles.typeBadge(ki.color)}>{ki.type}</span>
                <span style={styles.dateBadge}>
                  {ki.created ? new Date(ki.created).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
