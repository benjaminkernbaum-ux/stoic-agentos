import { useState } from 'react';
import { colors, gradients, shared } from './styles';

export default function OverviewPanel({ agents = [], workspaces = [], observations = [], knowledgeItems = [], stats = {}, usage = {} }) {
  const [hoveredCard, setHoveredCard] = useState(null);

  const liveAgents = agents.filter(a => a.status === 'running').length;
  const deployedAgents = agents.filter(a => a.status === 'success').length;
  const pendingAgents = agents.filter(a => a.status === 'idle' || a.status === 'paused').length;

  const heroStats = [
    { label: 'WORKSPACES', value: String(workspaces.length || stats.workspaces || 0), detail: 'Connected repositories', color: colors.accentBlue },
    { label: 'AI AGENTS', value: String(agents.length || stats.agents || 0), detail: `${liveAgents} live · ${deployedAgents} deployed · ${pendingAgents} pending`, color: colors.accentGreen },
    { label: 'OBSERVATIONS', value: String(observations.length || stats.observations || 0), detail: 'Captured this month', color: colors.accentPurple },
    { label: 'KNOWLEDGE ITEMS', value: String(knowledgeItems.length || stats.knowledgeItems || 0), detail: 'Persistent insights', color: colors.accentOrange || '#f59e0b' },
    { label: 'API USAGE', value: `${usage.count || 0}`, detail: `of ${(usage.limit || 0).toLocaleString()} limit`, color: colors.accentCyan },
  ];

  const styles = {
    heroGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 16,
      marginBottom: 28,
    },
    heroCard: (color) => ({
      ...shared.card,
      position: 'relative',
      overflow: 'hidden',
    }),
    heroTopBar: (color) => ({
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      background: color,
      borderRadius: '16px 16px 0 0',
    }),
    heroValue: (color) => ({
      fontSize: 36,
      fontWeight: 800,
      letterSpacing: -1,
      lineHeight: 1,
      color,
    }),
    heroDetail: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 6,
    },
    wsCard: {
      ...shared.card,
      cursor: 'pointer',
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    cardIcon: (bg) => ({
      width: 44,
      height: 44,
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 22,
      flexShrink: 0,
      background: bg,
    }),
    cardTitle: {
      fontSize: 15,
      fontWeight: 700,
      letterSpacing: -0.3,
    },
    cardSub: {
      fontSize: 11,
      color: colors.textDim,
      marginTop: 2,
    },
    cardBody: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 1.6,
    },
    tags: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      marginTop: 12,
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: colors.textDim,
    },
  };

  return (
    <div>
      {/* Hero Stats */}
      <div style={styles.heroGrid}>
        {heroStats.map((stat, i) => (
          <div
            key={stat.label}
            style={{
              ...styles.heroCard(stat.color),
              ...(hoveredCard === `hero-${i}` ? shared.cardHover : {}),
            }}
            onMouseEnter={() => setHoveredCard(`hero-${i}`)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={styles.heroTopBar(stat.color)} />
            <div style={shared.label}>{stat.label}</div>
            <div style={styles.heroValue(stat.color)}>{stat.value}</div>
            <div style={styles.heroDetail}>{stat.detail}</div>
          </div>
        ))}
      </div>

      {/* Agent Fleet Summary */}
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          🤖 Agent Fleet <span style={shared.badge}>{agents.length} agent{agents.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      {agents.length > 0 ? (
        <div style={shared.grid(280)}>
          {agents.slice(0, 8).map((agent, i) => (
            <div
              key={agent.id}
              style={{
                ...styles.wsCard,
                ...(hoveredCard === `agent-${i}` ? shared.cardHover : {}),
              }}
              onMouseEnter={() => setHoveredCard(`agent-${i}`)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={styles.cardHeader}>
                <div style={styles.cardIcon('rgba(167,139,250,0.12)')}>🤖</div>
                <div>
                  <div style={styles.cardTitle}>{agent.name}</div>
                  <div style={styles.cardSub}>{agent.module || 'Agent'}</div>
                </div>
              </div>
              <div style={styles.cardBody}>
                {agent.description || `Status: ${agent.status || 'idle'} · ${agent.total_runs || 0} runs`}
              </div>
              <div style={styles.tags}>
                <span style={shared.tag('rgba(167,139,250,0.15)', '#a78bfa')}>{agent.status || 'idle'}</span>
                <span style={shared.tag('rgba(0,230,138,0.15)', colors.accentGreen)}>{agent.total_runs || 0} runs</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <h3 style={{ color: colors.textSecondary, marginBottom: 8 }}>No agents registered yet</h3>
          <p>Register agents via the SDK or the Agents tab to see them here.</p>
        </div>
      )}

      {/* Workspace Overview */}
      <div style={{ ...shared.sectionHeader, marginTop: 28 }}>
        <div style={shared.sectionTitle}>
          📂 Workspace Overview <span style={shared.badge}>{workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      {workspaces.length > 0 ? (
        <div style={shared.grid(280)}>
          {workspaces.map((ws, i) => (
            <div
              key={ws.id}
              style={{
                ...styles.wsCard,
                ...(hoveredCard === `ws-${i}` ? shared.cardHover : {}),
              }}
              onMouseEnter={() => setHoveredCard(`ws-${i}`)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={styles.cardHeader}>
                <div style={styles.cardIcon('rgba(77,124,255,0.15)')}>📦</div>
                <div>
                  <div style={styles.cardTitle}>{ws.name}</div>
                  <div style={styles.cardSub}>{ws.stack || 'Workspace'}</div>
                </div>
              </div>
              <div style={styles.cardBody}>
                Branch: {ws.branch || 'main'}
              </div>
              <div style={styles.tags}>
                <span style={shared.tag('rgba(0,230,138,0.15)', colors.accentGreen)}>Active</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <h3 style={{ color: colors.textSecondary, marginBottom: 8 }}>No workspaces connected</h3>
          <p>Add workspaces from the Workspaces tab to manage your repositories.</p>
        </div>
      )}
    </div>
  );
}
