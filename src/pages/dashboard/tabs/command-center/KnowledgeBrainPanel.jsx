import { useState } from 'react';
import { colors, shared } from './styles';

const knowledgeItems = [
  { id: 'brain-integration', icon: '🧠', name: 'Master Brain v2.0', color: '#a78bfa', desc: 'Complete ecosystem brain — 14 workspaces, 23 agents, 17+ platforms, Memory Engine, Command Center, workflow commands', type: 'core', created: '2026-04-21' },
  { id: 'deployment-map', icon: '🚀', name: 'Deployment Map', color: '#ef4444', desc: 'Railway, Vercel, Supabase, Higgsfield topology. Full env key registry for 20+ platform integrations', type: 'infra', created: '2026-04-20' },
  { id: 'workspace-map', icon: '🗺️', name: 'Workspace & Git Map', color: '#3b82f6', desc: 'All 14 workspaces, 17 GitHub repos, git status, branches, context files, routing protocol', type: 'map', created: '2026-04-19' },
  { id: 'agent-fleet', icon: '🤖', name: 'Agent Fleet (23 Agents)', color: '#10b981', desc: '23 agents across 5 modules — Content, GTM, CRM, Finance, Standalone. Schedules, data contracts, orchestration rules', type: 'agents', created: '2026-04-18' },
  { id: 'stoiccrm-saas-state', icon: '💻', name: 'StoicCRM SaaS State', color: '#f59e0b', desc: 'Full production state — what works vs fake, 14 Supabase tables, 10 commits, Stripe setup, env vars', type: 'product', created: '2026-04-17' },
  { id: 'supabase-schema', icon: '🗄️', name: 'Supabase Schema', color: '#06b6d4', desc: '14 tables, column schemas, credentials, FK relationships, RLS policies, function map', type: 'database', created: '2026-04-16' },
  { id: 'recent-achievements', icon: '🏆', name: 'Recent Achievements', color: '#ec4899', desc: '11 conversation logs — what was built, commits, outcomes. Prevents re-doing work across sessions', type: 'history', created: '2026-04-15' },
];

const styles = {
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    padding: '10px 16px 10px 40px',
    background: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    color: colors.textPrimary,
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    fontSize: 14,
    color: colors.textDim,
  },
  countBadge: {
    background: 'rgba(167,139,250,0.15)',
    color: '#a78bfa',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  kiCard: (color, isHovered) => ({
    background: colors.bgCard,
    border: `1px solid ${isHovered ? color : colors.border}`,
    borderRadius: 12,
    padding: 18,
    transition: 'all 0.2s',
    cursor: 'default',
    borderLeft: `4px solid ${color}`,
    boxShadow: isHovered ? `0 0 20px ${color}22` : 'none',
  }),
  kiHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  kiIcon: {
    fontSize: 24,
  },
  kiName: {
    fontWeight: 700,
    fontSize: 14,
    color: colors.textPrimary,
  },
  kiId: (color) => ({
    fontSize: 11,
    color,
    fontFamily: "'JetBrains Mono', monospace",
  }),
  kiDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 1.5,
    marginBottom: 12,
  },
  typeBadge: (color) => ({
    padding: '2px 8px',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 600,
    background: `${color}18`,
    color,
    textTransform: 'uppercase',
  }),
  dateBadge: {
    fontSize: 10,
    color: colors.textDim,
    fontFamily: "'JetBrains Mono', monospace",
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: colors.textDim,
  },
};

export default function KnowledgeBrainPanel() {
  const [search, setSearch] = useState('');
  const [hovered, setHovered] = useState(null);

  const filtered = knowledgeItems.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.desc.toLowerCase().includes(search.toLowerCase()) ||
    item.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          🧠 Knowledge Brain{' '}
          <span style={shared.badge}>Antigravity Knowledge Items</span>
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
        <span style={styles.countBadge}>{filtered.length} items · 56 KB</span>
      </div>

      {/* Items Grid */}
      {filtered.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
          <h3 style={{ color: colors.textSecondary, marginBottom: 8 }}>No knowledge items yet</h3>
          <p>Knowledge items will appear here as they are captured by the system.</p>
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
                  <div style={styles.kiId(ki.color)}>{ki.id}</div>
                </div>
              </div>
              <div style={styles.kiDesc}>{ki.desc}</div>
              <div style={styles.footer}>
                <span style={styles.typeBadge(ki.color)}>{ki.type}</span>
                <span style={styles.dateBadge}>{ki.created}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
