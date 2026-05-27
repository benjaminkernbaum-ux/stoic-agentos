import { useState } from 'react';
import { colors, shared, statusTag } from './styles';

const styles = {
  agentRow: (isHovered) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    background: isHovered ? colors.bgCardHover : colors.bgCard,
    border: `1px solid ${isHovered ? colors.borderGlow : colors.border}`,
    borderRadius: 8,
    transition: 'all 0.12s ease',
    fontSize: 13,
    marginBottom: 6,
  }),
  agentId: {
    fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
    fontSize: 11,
    fontWeight: 500,
    color: 'rgba(161,161,170,0.85)',
    minWidth: 85,
  },
  agentName: {
    fontWeight: 500,
    flex: 1,
  },
  agentTrigger: {
    fontSize: 11,
    color: colors.textDim,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: colors.textDim,
  },
};

export default function AgentFleetPanel({ agents = [] }) {
  const [hoveredAgent, setHoveredAgent] = useState(null);

  const grouped = {};
  agents.forEach(agent => {
    const mod = agent.module || 'General';
    if (!grouped[mod]) grouped[mod] = [];
    grouped[mod].push(agent);
  });
  const departments = Object.entries(grouped).map(([title, list]) => ({ title, agents: list }));

  return (
    <div>
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          Agent Fleet{' '}
          <span style={shared.badge}>{agents.length} agent{agents.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {agents.length > 0 ? (
        departments.map(dept => (
          <div key={dept.title} style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 11,
              fontWeight: 500,
              color: colors.textDim,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              {dept.title}
              <div style={{ flex: 1, height: 1, background: colors.border }} />
            </div>
            <div>
              {dept.agents.map(agent => (
                <div
                  key={agent.id}
                  style={styles.agentRow(hoveredAgent === agent.id)}
                  onMouseEnter={() => setHoveredAgent(agent.id)}
                  onMouseLeave={() => setHoveredAgent(null)}
                >
                  <span style={styles.agentId}>{(agent.name || '').substring(0, 8).toUpperCase()}</span>
                  <span style={styles.agentName}>{agent.name}</span>
                  <span style={statusTag(agent.status || 'idle')}>{agent.status || 'idle'}</span>
                  <span style={styles.agentTrigger}>{agent.total_runs || 0} runs</span>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 24, marginBottom: 16, opacity: 0.4 }}>◈</div>
          <h3 style={{ color: colors.textSecondary, marginBottom: 8 }}>No agents registered</h3>
          <p>Register agents via the SDK or the Agents tab to see them here.</p>
        </div>
      )}
    </div>
  );
}
