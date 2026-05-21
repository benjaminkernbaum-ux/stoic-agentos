import { useState } from 'react';
import { colors, shared, statusTag } from './styles';

const departments = [
  {
    title: '⚡ Operations & Content',
    agents: [
      { id: 'AUTO', name: 'AutoCalendar', status: 'live', trigger: 'Cron 09:00 + 20:00 BRT' },
      { id: 'WIRE', name: 'Telegram Bot', status: 'live', trigger: 'AUTO completes' },
      { id: 'LW-EA', name: 'MT5 Expert Advisor', status: 'live', trigger: 'MT5 OnTick()' },
      { id: 'N8N', name: 'Orchestrator', status: 'live', trigger: 'Cron / Webhook / Telegram' },
      { id: 'STOICBOT', name: 'Telegram Bot 24/7', status: 'live', trigger: 'Cron + n8n + TradingView' },
      { id: 'LENS', name: 'FishFinder AI', status: 'planned', trigger: 'Camera tap' },
    ],
  },
  {
    title: '📣 GTM Pipeline',
    agents: [
      { id: 'SCRAPE', name: 'LinkedIn Scraper', status: 'live', trigger: 'Manual CLI' },
      { id: 'ADGEN', name: 'FB Ad Generator', status: 'live', trigger: 'Manual CLI' },
      { id: 'ADSPY', name: 'Competitor Ad Spy', status: 'live', trigger: 'Manual CLI' },
      { id: 'NEWSFEED', name: 'Newsletter Agent', status: 'live', trigger: 'Manual / Daily cron' },
      { id: 'VIRALIZER', name: 'Content Multiplier', status: 'live', trigger: 'Manual / Post-newsfeed' },
      { id: 'SEOFACTORY', name: 'SEO Content Factory', status: 'live', trigger: 'Manual CLI' },
    ],
  },
  {
    title: '💬 CRM & Communication',
    agents: [
      { id: 'OUTREACH', name: 'WhatsApp Sender', status: 'live', trigger: 'Scheduled / Manual' },
      { id: 'REPLY', name: 'AI Auto-Reply', status: 'live', trigger: 'Incoming message' },
      { id: 'DIALER', name: 'Email + Phone Outreach', status: 'live', trigger: 'Scheduled campaign' },
    ],
  },
  {
    title: '🏛 Financial Department',
    agents: [
      { id: 'FINCFO', name: 'CFO Agent', status: 'deployed', trigger: 'Daily 07:00 BRT', saves: '$4-5K/mo' },
      { id: 'LEDGER', name: 'Bookkeeping Agent', status: 'deployed', trigger: 'Daily 23:00 BRT', saves: '$1.2K/mo' },
      { id: 'FORECAST', name: 'FP&A Agent', status: 'pending', trigger: 'Weekly Mon 08:00', saves: '$4.5K/mo' },
      { id: 'TAXBOT', name: 'Tax Compliance', status: 'deployed', trigger: '5th monthly 09:00', saves: '$800/mo' },
      { id: 'RECON', name: 'Revenue Controller', status: 'pending', trigger: '1st monthly', saves: '$5K/mo' },
      { id: 'DUNNING', name: 'Collections Agent', status: 'live', trigger: 'Failed payment event' },
      { id: 'WATCHDOG', name: 'Risk Monitor', status: 'deployed', trigger: 'Daily 06:45 BRT' },
      { id: 'CASHFLOW', name: 'Treasury Agent', status: 'pending', trigger: 'Daily 08:00 BRT' },
    ],
  },
];

const styles = {
  dept: {
    marginBottom: 28,
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
  agentRow: (isHovered) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    background: isHovered ? colors.bgCardHover : colors.bgCard,
    border: `1px solid ${isHovered ? colors.borderGlow : colors.border}`,
    borderRadius: 10,
    transition: 'all 0.2s',
    fontSize: 13,
    marginBottom: 6,
  }),
  agentId: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    fontWeight: 600,
    color: colors.accentCyan,
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
  },
  saves: {
    fontSize: 10,
    color: colors.accentOrange,
    marginLeft: 8,
  },
};

export default function AgentFleetPanel() {
  const [hoveredAgent, setHoveredAgent] = useState(null);

  return (
    <div>
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          🤖 Agent Fleet{' '}
          <span style={shared.badge}>23 agents · $184K+ annual savings</span>
        </div>
      </div>

      {departments.map(dept => (
        <div key={dept.title} style={styles.dept}>
          <div style={styles.deptTitle}>
            {dept.title}
            <div style={styles.deptLine} />
          </div>
          <div>
            {dept.agents.map(agent => (
              <div
                key={agent.id}
                style={styles.agentRow(hoveredAgent === agent.id)}
                onMouseEnter={() => setHoveredAgent(agent.id)}
                onMouseLeave={() => setHoveredAgent(null)}
              >
                <span style={styles.agentId}>{agent.id}</span>
                <span style={styles.agentName}>{agent.name}</span>
                <span style={statusTag(agent.status)}>{agent.status}</span>
                <span style={styles.agentTrigger}>{agent.trigger}</span>
                {agent.saves && <span style={styles.saves}>Saves {agent.saves}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
