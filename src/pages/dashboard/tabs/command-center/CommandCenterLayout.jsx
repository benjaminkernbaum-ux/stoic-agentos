import { useState } from 'react';
import { colors } from './styles';

import OverviewPanel from './OverviewPanel';
import WorkspacesPanel from './WorkspacesPanel';
import AgentFleetPanel from './AgentFleetPanel';
import PlatformsPanel from './PlatformsPanel';
import KnowledgeGraphPanel from './KnowledgeGraphPanel';
import KnowledgeBrainPanel from './KnowledgeBrainPanel';
import DependenciesPanel from './DependenciesPanel';
import FeTokPanel from './FeTokPanel';
import GeoOpsPanel from './GeoOpsPanel';

const TABS = [
  { id: 'overview',  label: '🏠 Overview',         color: null },
  { id: 'workspaces', label: '📂 Workspaces',      color: null },
  { id: 'agents',    label: '🤖 Agent Fleet',       color: null },
  { id: 'platforms', label: '🔗 Platforms',          color: null },
  { id: 'graph',     label: '🕸️ Knowledge Graph',   color: null },
  { id: 'brain',     label: '🧠 Knowledge Brain',   color: '#a855f7' },
  { id: 'deps',      label: '🔀 Dependencies',      color: null },
  { id: 'fetok',     label: '🎬 FéTok',             color: '#fbbf24' },
  { id: 'geoops',    label: '🌍 GeoOps',            color: '#00d4ff' },
];

const styles = {
  wrapper: {
    background: colors.bgPrimary,
    minHeight: '100%',
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: colors.textPrimary,
    position: 'relative',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 28px',
    borderBottom: `1px solid rgba(255,255,255,0.06)`,
    backdropFilter: 'blur(16px)',
    background: 'rgba(10, 10, 15, 0.85)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  logoIcon: {
    width: 38,
    height: 38,
    background: 'linear-gradient(135deg, #4d7cff, #9b59ff, #ff6b9d)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 800,
    boxShadow: '0 4px 20px rgba(77, 124, 255, 0.3)',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: -0.5,
    background: 'linear-gradient(135deg, #4d7cff, #9b59ff, #ff6b9d)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  headerSub: {
    fontSize: 11,
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: 500,
  },
  hqBadge: {
    padding: '4px 12px',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    background: 'rgba(99, 102, 241, 0.15)',
    color: colors.accentIndigo,
    border: '1px solid rgba(99, 102, 241, 0.25)',
    letterSpacing: 1,
  },
  tabBar: {
    display: 'flex',
    gap: 2,
    padding: '8px 28px',
    background: colors.bgSecondary,
    borderBottom: `1px solid ${colors.border}`,
    overflowX: 'auto',
    position: 'relative',
    zIndex: 40,
  },
  tab: (isActive, specialColor) => ({
    padding: '10px 20px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    color: isActive
      ? (specialColor || colors.accentBlue)
      : colors.textSecondary,
    cursor: 'pointer',
    transition: 'all 0.25s',
    whiteSpace: 'nowrap',
    border: '1px solid transparent',
    background: isActive
      ? `${(specialColor || colors.accentBlue)}18`
      : 'transparent',
    borderColor: isActive
      ? `${(specialColor || colors.accentBlue)}33`
      : 'transparent',
    boxShadow: isActive && specialColor
      ? `0 0 20px ${specialColor}22`
      : 'none',
    userSelect: 'none',
  }),
  main: {
    position: 'relative',
    padding: '24px 28px',
    maxWidth: 1600,
    margin: '0 auto',
  },
};

export default function CommandCenterLayout({ agents = [], workspaces = [], observations = [], knowledgeItems = [], stats = {}, usage = {} }) {
  const [activeTab, setActiveTab] = useState('overview');

  // Compute dynamic header subtitle
  const wsCount = workspaces.length || stats.workspaces || 0;
  const agentCount = agents.length || stats.agents || 0;
  const headerSub = `Your Ecosystem · ${wsCount} Workspace${wsCount !== 1 ? 's' : ''} · ${agentCount} Agent${agentCount !== 1 ? 's' : ''}`;

  // Panel map — each receives real data
  const panelProps = { agents, workspaces, observations, knowledgeItems, stats, usage };
  const PANELS = {
    overview:   OverviewPanel,
    workspaces: WorkspacesPanel,
    agents:     AgentFleetPanel,
    platforms:  PlatformsPanel,
    graph:      KnowledgeGraphPanel,
    brain:      KnowledgeBrainPanel,
    deps:       DependenciesPanel,
    fetok:      FeTokPanel,
    geoops:     GeoOpsPanel,
  };
  const Panel = PANELS[activeTab];

  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoIcon}>⚡</div>
          <div>
            <div style={styles.headerTitle}>COMMAND CENTER</div>
            <div style={styles.headerSub}>{headerSub}</div>
          </div>
        </div>
        <div style={styles.hqBadge}>HQ</div>
      </div>

      {/* Tab Bar */}
      <div style={styles.tabBar}>
        {TABS.map(tab => (
          <div
            key={tab.id}
            style={styles.tab(activeTab === tab.id, tab.color)}
            onClick={() => setActiveTab(tab.id)}
            onMouseEnter={e => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = colors.textPrimary;
                e.currentTarget.style.background = colors.bgCard;
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = colors.textSecondary;
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Active Panel */}
      <div style={styles.main}>
        {Panel && <Panel {...panelProps} />}
      </div>
    </div>
  );
}
