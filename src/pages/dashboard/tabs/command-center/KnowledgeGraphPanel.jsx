import { colors, shared } from './styles';

const styles = {
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
    color: colors.textDim,
  },
  wrapper: {
    background: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 400,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default function KnowledgeGraphPanel({ observations = [], agents = [] }) {
  const nodeCount = observations.length + agents.length;
  const hasData = nodeCount > 0;

  return (
    <div>
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          🕸️ Knowledge Graph{' '}
          <span style={shared.badge}>
            {hasData ? `${nodeCount} nodes` : 'No data yet'}
          </span>
        </div>
      </div>

      <div style={styles.wrapper}>
        <div style={styles.emptyState}>
          <div style={{ fontSize: 64, marginBottom: 20, opacity: 0.3 }}>🕸️</div>
          <h3 style={{ color: colors.textSecondary, marginBottom: 10, fontSize: 18 }}>
            {hasData ? 'Graph Visualization' : 'Knowledge Graph'}
          </h3>
          <p style={{ maxWidth: 400, margin: '0 auto', lineHeight: 1.6, fontSize: 13 }}>
            {hasData
              ? `Your graph contains ${agents.length} agent nodes and ${observations.length} observation nodes. Interactive visualization coming soon.`
              : 'Add agents and capture observations to build your knowledge graph. The interactive visualization will appear here.'}
          </p>
          {hasData && (
            <div style={{
              display: 'flex', gap: 16, justifyContent: 'center', marginTop: 20,
              flexWrap: 'wrap',
            }}>
              <div style={{
                padding: '8px 16px', borderRadius: 8,
                background: 'rgba(167,139,250,0.1)',
                border: `1px solid rgba(167,139,250,0.2)`,
                fontSize: 13, color: '#a78bfa',
              }}>
                🤖 {agents.length} Agents
              </div>
              <div style={{
                padding: '8px 16px', borderRadius: 8,
                background: 'rgba(59,130,246,0.1)',
                border: `1px solid rgba(59,130,246,0.2)`,
                fontSize: 13, color: '#3b82f6',
              }}>
                🧠 {observations.length} Observations
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
