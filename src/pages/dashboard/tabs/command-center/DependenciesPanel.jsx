import { colors, shared } from './styles';

const styles = {
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: colors.textDim,
  },
  depMap: {
    background: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  depRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '8px 0', borderBottom: `1px solid ${colors.border}`,
  },
  depSource: { fontWeight: 600, fontSize: 13, minWidth: 140, color: colors.accentBlue },
  depArrow: { color: colors.textDim, fontSize: 16 },
  depTarget: { fontSize: 13, color: colors.textSecondary },
  depLabel: { fontSize: 10, color: colors.textDim, fontStyle: 'italic', marginLeft: 'auto' },
};

export default function DependenciesPanel({ agents = [], workspaces = [] }) {
  const hasData = agents.length > 0 || workspaces.length > 0;

  // Build dynamic dependencies from actual data
  const deps = [];
  agents.forEach(agent => {
    if (agent.module) {
      deps.push({
        source: agent.name,
        target: agent.module,
        label: `${agent.total_runs || 0} runs · ${agent.status || 'idle'}`,
      });
    }
  });

  return (
    <div>
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          🔀 Dependencies{' '}
          <span style={shared.badge}>{hasData ? 'Agent → Module flows' : 'No data yet'}</span>
        </div>
      </div>

      {deps.length > 0 ? (
        <div style={styles.depMap}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: colors.textSecondary,
            textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            ⚡ Agent → Module Mapping
            <div style={{ flex: 1, height: 1, background: colors.border }} />
          </div>
          {deps.map((dep, i) => (
            <div key={`${dep.source}-${i}`} style={{
              ...styles.depRow,
              ...(i === deps.length - 1 ? { borderBottom: 'none' } : {}),
            }}>
              <span style={styles.depSource}>{dep.source}</span>
              <span style={styles.depArrow}>→</span>
              <span style={styles.depTarget}>{dep.target}</span>
              <span style={styles.depLabel}>{dep.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🔀</div>
          <h3 style={{ color: colors.textSecondary, marginBottom: 8 }}>No dependencies yet</h3>
          <p style={{ maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
            Register agents with modules to see cross-workspace dependency flows.
          </p>
        </div>
      )}
    </div>
  );
}
