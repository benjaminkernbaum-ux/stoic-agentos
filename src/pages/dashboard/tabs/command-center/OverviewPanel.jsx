import { useState } from 'react';
import { colors, shared, statusTag } from './styles';

export default function OverviewPanel({ agents = [], workspaces = [], observations = [], knowledgeItems = [], stats = {}, usage = {} }) {
  const [hoveredCard, setHoveredCard] = useState(null);

  const liveAgents = agents.filter(a => a.status === 'running').length;
  const deployedAgents = agents.filter(a => a.status === 'success').length;
  const pendingAgents = agents.filter(a => a.status === 'idle' || a.status === 'paused').length;

  const totalItems = observations.length + agents.length + workspaces.length;
  const recentObs = observations.filter(o => {
    const age = Date.now() - new Date(o.created_at).getTime();
    return age < 7 * 24 * 60 * 60 * 1000;
  }).length;
  const agentsWithErrors = agents.filter(a => a.status === 'error').length;
  const staleAgents = agents.filter(a => a.status === 'idle' && a.total_runs === 0).length;
  const healthScore = totalItems === 0 ? 0 : Math.min(100, Math.round(
    (recentObs > 0 ? 25 : 0) +
    (agents.length > 0 ? 25 : 0) +
    (workspaces.length > 0 ? 25 : 0) +
    (agentsWithErrors === 0 ? 25 : Math.max(0, 25 - agentsWithErrors * 5))
  ));

  const heroStats = [
    { label: 'WORKSPACES', value: String(workspaces.length || stats.workspaces || 0), detail: 'Connected repositories' },
    { label: 'AI AGENTS', value: String(agents.length || stats.agents || 0), detail: `${liveAgents} live · ${deployedAgents} deployed · ${pendingAgents} pending` },
    { label: 'OBSERVATIONS', value: String(observations.length || stats.observations || 0), detail: 'Captured this month' },
    { label: 'KNOWLEDGE ITEMS', value: String(knowledgeItems.length || stats.knowledgeItems || 0), detail: 'Persistent insights' },
    { label: 'API USAGE', value: `${usage.count || 0}`, detail: `of ${(usage.limit || 0).toLocaleString()} limit` },
  ];

  const styles = {
    heroGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 16,
      marginBottom: 28,
    },
    heroCard: {
      ...shared.card,
      position: 'relative',
      overflow: 'hidden',
    },
    heroValue: {
      fontSize: 28,
      fontWeight: 600,
      letterSpacing: -0.5,
      lineHeight: 1,
      color: '#fafafa',
      fontVariantNumeric: 'tabular-nums',
    },
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
    cardIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 16,
      flexShrink: 0,
      background: 'rgba(255,255,255,0.06)',
      color: 'rgba(161,161,170,0.85)',
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: 600,
      letterSpacing: -0.2,
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
              ...styles.heroCard,
              ...(hoveredCard === `hero-${i}` ? shared.cardHover : {}),
            }}
            onMouseEnter={() => setHoveredCard(`hero-${i}`)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={shared.label}>{stat.label}</div>
            <div style={styles.heroValue}>{stat.value}</div>
            <div style={styles.heroDetail}>{stat.detail}</div>
          </div>
        ))}
      </div>

      {/* Agent Fleet Summary */}
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          Agent Fleet <span style={shared.badge}>{agents.length} agent{agents.length !== 1 ? 's' : ''}</span>
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
                <div style={styles.cardIcon}>◈</div>
                <div>
                  <div style={styles.cardTitle}>{agent.name}</div>
                  <div style={styles.cardSub}>{agent.module || 'Agent'}</div>
                </div>
              </div>
              <div style={styles.cardBody}>
                {agent.description || `Status: ${agent.status || 'idle'} · ${agent.total_runs || 0} runs`}
              </div>
              <div style={styles.tags}>
                <span style={statusTag(agent.status || 'idle')}>{agent.status || 'idle'}</span>
                <span style={shared.tag('rgba(255,255,255,0.06)', 'rgba(161,161,170,0.85)')}>{agent.total_runs || 0} runs</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 24, marginBottom: 16, opacity: 0.4 }}>◈</div>
          <h3 style={{ color: colors.textSecondary, marginBottom: 8 }}>No agents registered yet</h3>
          <p>Register agents via the SDK or the Agents tab to see them here.</p>
        </div>
      )}

      {/* Workspace Overview */}
      <div style={{ ...shared.sectionHeader, marginTop: 28 }}>
        <div style={shared.sectionTitle}>
          Workspace Overview <span style={shared.badge}>{workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}</span>
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
                <div style={styles.cardIcon}>▦</div>
                <div>
                  <div style={styles.cardTitle}>{ws.name}</div>
                  <div style={styles.cardSub}>{ws.stack || 'Workspace'}</div>
                </div>
              </div>
              <div style={styles.cardBody}>
                Branch: {ws.branch || 'main'}
              </div>
              <div style={styles.tags}>
                <span style={statusTag('active')}>Active</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 24, marginBottom: 16, opacity: 0.4 }}>▦</div>
          <h3 style={{ color: colors.textSecondary, marginBottom: 8 }}>No workspaces connected</h3>
          <p>Add workspaces from the Workspaces tab to manage your repositories.</p>
        </div>
      )}

      {/* Vault Health */}
      <div style={{ ...shared.sectionHeader, marginTop: 28 }}>
        <div style={shared.sectionTitle}>
          Vault Health{' '}
          <span style={{
            ...shared.badge,
            background: healthScore > 75 ? 'rgba(34,197,94,0.1)' : healthScore > 50 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
            color: healthScore > 75 ? '#22c55e' : healthScore > 50 ? '#f59e0b' : '#ef4444',
          }}>
            {healthScore}%
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <div
          style={{ ...shared.card, borderRadius: 10, padding: 16, ...(hoveredCard === 'vh-0' ? shared.cardHover : {}) }}
          onMouseEnter={() => setHoveredCard('vh-0')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={{ fontSize: 16, marginBottom: 8, opacity: 0.5 }}>◉</div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5, color: '#fafafa' }}>{recentObs}</div>
          <div style={shared.label}>Knowledge Activity</div>
          <div style={{ fontSize: 11, color: colors.textSecondary }}>observations this week</div>
        </div>

        <div
          style={{ ...shared.card, borderRadius: 10, padding: 16, ...(hoveredCard === 'vh-1' ? shared.cardHover : {}) }}
          onMouseEnter={() => setHoveredCard('vh-1')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={{ fontSize: 16, marginBottom: 8, opacity: 0.5 }}>◈</div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5, color: '#fafafa' }}>{agents.length - agentsWithErrors}/{agents.length}</div>
          <div style={shared.label}>Agent Health</div>
          <div style={{ fontSize: 11, color: colors.textSecondary }}>healthy agents</div>
        </div>

        <div
          style={{ ...shared.card, borderRadius: 10, padding: 16, ...(hoveredCard === 'vh-2' ? shared.cardHover : {}) }}
          onMouseEnter={() => setHoveredCard('vh-2')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={{ fontSize: 16, marginBottom: 8, opacity: 0.5 }}>△</div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5, color: '#fafafa' }}>{staleAgents}</div>
          <div style={shared.label}>Stale Items</div>
          <div style={{ fontSize: 11, color: colors.textSecondary }}>idle agents with 0 runs</div>
        </div>

        <div
          style={{ ...shared.card, borderRadius: 10, padding: 16, ...(hoveredCard === 'vh-3' ? shared.cardHover : {}) }}
          onMouseEnter={() => setHoveredCard('vh-3')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={{ fontSize: 16, marginBottom: 8, opacity: 0.5 }}>▦</div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5, color: '#fafafa' }}>{workspaces.length}</div>
          <div style={shared.label}>Coverage</div>
          <div style={{ fontSize: 11, color: colors.textSecondary }}>workspaces covered</div>
        </div>
      </div>

      {/* Health Score Progress Bar */}
      <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ width: `${healthScore}%`, height: '100%', borderRadius: 2, background: '#a78bfa', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}
