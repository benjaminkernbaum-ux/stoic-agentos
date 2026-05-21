import { colors, shared } from './styles';

const depGroups = [
  {
    title: '🎨 Brand Identity Flows',
    deps: [
      { source: 'brand-vault/', target: 'LuzDaPalavra', label: 'Visual identity, colors, templates' },
      { source: 'brand-vault/', target: 'GTM-Pipelines', label: 'Voice & tone for content generation' },
      { source: 'brand-vault/', target: 'StoicCRM', label: 'Design tokens for SaaS Hub' },
    ],
  },
  {
    title: '🔧 Infrastructure Flows',
    deps: [
      { source: 'agent-ops/', target: 'All Workspaces', label: 'Automation coordination & health checks' },
      { source: 'StoicCRM/n8n', target: 'Telegram, Stripe, Supabase', label: '31 automated workflows' },
      { source: 'stoic-factory', target: 'Higgsfield, ElevenLabs, FFmpeg', label: 'Video rendering pipeline' },
      { source: 'StoicBot', target: 'Railway, Telegram API', label: '24/7 cloud deployment' },
    ],
  },
  {
    title: '📊 Data Flows',
    deps: [
      { source: 'Supabase', target: 'SaaS Hub, CRM, stoic-factory', label: 'PostgreSQL + RLS multi-tenant' },
      { source: 'TradingView', target: 'StoicTrading → Telegram', label: 'Webhook signals → alerts' },
      { source: 'Memory Engine', target: 'agent-ops → All AI conversations', label: 'SQLite observation tracking' },
    ],
  },
];

const styles = {
  depMap: {
    background: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  deptTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  deptLine: {
    flex: 1,
    height: 1,
    background: colors.border,
  },
  depRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 0',
    borderBottom: `1px solid ${colors.border}`,
  },
  depRowLast: {
    borderBottom: 'none',
  },
  depSource: {
    fontWeight: 600,
    fontSize: 13,
    minWidth: 140,
    color: colors.accentBlue,
  },
  depArrow: {
    color: colors.textDim,
    fontSize: 16,
  },
  depTarget: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  depLabel: {
    fontSize: 10,
    color: colors.textDim,
    fontStyle: 'italic',
    marginLeft: 'auto',
  },
};

export default function DependenciesPanel() {
  return (
    <div>
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          🔀 Dependency Graph{' '}
          <span style={shared.badge}>Cross-workspace flows</span>
        </div>
      </div>

      {depGroups.map(group => (
        <div key={group.title} style={styles.depMap}>
          <div style={styles.deptTitle}>
            {group.title}
            <div style={styles.deptLine} />
          </div>
          {group.deps.map((dep, i) => (
            <div
              key={`${dep.source}-${dep.target}`}
              style={{
                ...styles.depRow,
                ...(i === group.deps.length - 1 ? styles.depRowLast : {}),
              }}
            >
              <span style={styles.depSource}>{dep.source}</span>
              <span style={styles.depArrow}>→</span>
              <span style={styles.depTarget}>{dep.target}</span>
              <span style={styles.depLabel}>{dep.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
