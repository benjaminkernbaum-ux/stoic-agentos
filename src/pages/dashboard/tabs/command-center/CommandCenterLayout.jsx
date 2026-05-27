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
  { id: 'overview',  label: 'Overview' },
  { id: 'workspaces', label: 'Workspaces' },
  { id: 'agents',    label: 'Agent Fleet' },
  { id: 'platforms', label: 'Platforms' },
  { id: 'graph',     label: 'Knowledge Graph' },
  { id: 'brain',     label: 'Knowledge Brain' },
  { id: 'deps',      label: 'Dependencies' },
  { id: 'fetok',     label: 'FéTok' },
  { id: 'geoops',    label: 'GeoOps' },
];

const styles = {
  wrapper: {
    background: '#09090b',
    minHeight: '100%',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    color: '#fafafa',
    position: 'relative',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: '#0a0a0c',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  logoIcon: {
    width: 32,
    height: 32,
    background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: -0.3,
    color: '#fafafa',
  },
  headerSub: {
    fontSize: 11,
    color: 'rgba(113,113,122,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 500,
  },
  hqBadge: {
    padding: '4px 10px',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 600,
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(161,161,170,0.85)',
    border: '1px solid rgba(255,255,255,0.08)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tabBar: {
    display: 'flex',
    gap: 2,
    padding: '8px 32px',
    background: '#0a0a0c',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    overflowX: 'auto',
    position: 'relative',
    zIndex: 40,
  },
  tab: (isActive) => ({
    padding: '8px 16px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? '#fafafa' : 'rgba(161,161,170,0.85)',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    whiteSpace: 'nowrap',
    border: 'none',
    background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
    userSelect: 'none',
  }),
  main: {
    position: 'relative',
    padding: '28px 32px',
    maxWidth: 1600,
    margin: '0 auto',
  },
};

export default function CommandCenterLayout({ agents = [], workspaces = [], observations = [], knowledgeItems = [], stats = {}, usage = {} }) {
  const [activeTab, setActiveTab] = useState('overview');

  const wsCount = workspaces.length || stats.workspaces || 0;
  const agentCount = agents.length || stats.agents || 0;
  const headerSub = `Your Ecosystem · ${wsCount} Workspace${wsCount !== 1 ? 's' : ''} · ${agentCount} Agent${agentCount !== 1 ? 's' : ''}`;

  const panelProps = { agents, workspaces, observations, knowledgeItems, stats, usage };
  const PANELS = {
    overview: OverviewPanel,
    workspaces: WorkspacesPanel,
    agents: AgentFleetPanel,
    platforms: PlatformsPanel,
    graph: KnowledgeGraphPanel,
    brain: KnowledgeBrainPanel,
    deps: DependenciesPanel,
    fetok: FeTokPanel,
    geoops: GeoOpsPanel,
  };
  const Panel = PANELS[activeTab];

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoIcon}>⌘</div>
          <div>
            <div style={styles.headerTitle}>Command Center</div>
            <div style={styles.headerSub}>{headerSub}</div>
          </div>
        </div>
        <div style={styles.hqBadge}>HQ</div>
      </div>

      <div style={styles.tabBar}>
        {TABS.map(tab => (
          <div
            key={tab.id}
            style={styles.tab(activeTab === tab.id)}
            onClick={() => setActiveTab(tab.id)}
            onMouseEnter={e => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = '#fafafa';
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = 'rgba(161,161,170,0.85)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      <div style={styles.main}>
        {Panel && <Panel {...panelProps} />}
      </div>
    </div>
  );
}
