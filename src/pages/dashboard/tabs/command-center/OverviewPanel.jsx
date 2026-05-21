import { useState } from 'react';
import { colors, gradients, shared } from './styles';

const heroStats = [
  { label: 'Workspaces', value: '11', detail: 'Subject-based architecture', color: colors.accentBlue },
  { label: 'AI Agents', value: '23', detail: '15 live · 5 deployed · 3 pending', color: colors.accentGreen },
  { label: 'n8n Workflows', value: '31', detail: 'Content → Finance → Security', color: colors.accentPurple },
  { label: 'Annual Savings', value: '$184K', detail: 'AI Finance Dept alone', color: colors.accentOrange },
  { label: 'Knowledge Graph', value: '124', detail: 'Nodes · 235 edges · 12 communities', color: colors.accentCyan },
];

const workspaces = [
  { emoji: '🎬', name: 'LuzDaPalavra', sub: 'Biblical cinematic videos', desc: 'Higgsfield pipeline, TikTok FYP engine, stoic-factory cloud deploy, video rendering & post-production.', tags: ['Python', 'Node.js'], status: 'Active' },
  { emoji: '📊', name: 'StoicCRM', sub: 'CRM + SaaS Dashboard', desc: 'Lead management, n8n orchestrator, SaaS Hub (React/Vite), stoic-jarvis AI assistant, marketing.', tags: ['React', 'Python'], status: 'Active' },
  { emoji: '📈', name: 'StoicTrading', sub: 'Forex EA + Market Data', desc: 'Larry Williams 9.1 D1 EA, live quotes bot, market data analysis, TradingView integration.', tags: ['MQL5', 'Python'], status: 'Live' },
  { emoji: '📣', name: 'GTM-Pipelines', sub: 'Go-To-Market Automation', desc: 'Ad Spy, Ad Generator, SEO Factory, Viralizer, Newsletter, LinkedIn Scraper — full outbound stack.', tags: ['Python'], status: '6 Agents' },
  { emoji: '🤖', name: 'TelegramBots', sub: 'Bot Projects', desc: 'Telegram bot suite — StoicBot 24/7 cloud, notification bots, community interaction.', tags: ['TypeScript'], status: 'Live' },
  { emoji: '🔒', name: 'CyberArmor', sub: 'Security Monitor', desc: 'ASUS Cyber Armor defense system, prompt hardening audits, environment security scanning.', tags: ['Python'], status: 'Deployed' },
];

const platformsQuick = [
  { emoji: '🐙', name: 'GitHub', role: 'Source control & CI/CD' },
  { emoji: '🚂', name: 'Railway', role: 'Cloud deploy (bots, factory, n8n)' },
  { emoji: '▲', name: 'Vercel', role: 'SaaS Hub frontend hosting' },
  { emoji: '⚡', name: 'Supabase', role: 'PostgreSQL + Auth + RLS' },
  { emoji: '🔧', name: 'n8n', role: '31 workflows · Low-code automation' },
  { emoji: '✈️', name: 'Telegram', role: 'Bot + Channel + Notifications' },
  { emoji: '📸', name: 'Instagram', role: 'Content posting + Reels' },
  { emoji: '🎵', name: 'TikTok', role: 'Biblical cinematic reels' },
  { emoji: '📊', name: 'MetaTrader 5', role: 'Larry Williams EA execution' },
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
  platformGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
    gap: 14,
    marginBottom: 28,
  },
  platformCard: {
    ...shared.card,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    cursor: 'pointer',
    padding: 18,
  },
  platformLogo: {
    width: 46,
    height: 46,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    flexShrink: 0,
    background: 'rgba(255,255,255,0.04)',
  },
};

const techColorMap = {
  'Python': { bg: 'rgba(0, 212, 255, 0.1)', color: colors.accentCyan },
  'React': { bg: 'rgba(155, 89, 255, 0.1)', color: colors.accentPurple },
  'Node.js': { bg: 'rgba(0, 230, 138, 0.1)', color: colors.accentGreen },
  'TypeScript': { bg: 'rgba(0, 230, 138, 0.1)', color: colors.accentGreen },
  'MQL5': { bg: 'rgba(255, 215, 0, 0.1)', color: colors.accentGold },
};

export default function OverviewPanel() {
  const [hoveredCard, setHoveredCard] = useState(null);

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

      {/* Workspace Overview */}
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          📂 Workspace Overview <span style={shared.badge}>11 workspaces</span>
        </div>
      </div>
      <div style={shared.grid(280)}>
        {workspaces.map((ws, i) => (
          <div
            key={ws.name}
            style={{
              ...styles.wsCard,
              ...(hoveredCard === `ws-${i}` ? shared.cardHover : {}),
            }}
            onMouseEnter={() => setHoveredCard(`ws-${i}`)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={styles.cardHeader}>
              <div style={styles.cardIcon(`${techColorMap[ws.tags[0]]?.bg || 'rgba(77,124,255,0.15)'}`)}>
                {ws.emoji}
              </div>
              <div>
                <div style={styles.cardTitle}>{ws.name}</div>
                <div style={styles.cardSub}>{ws.sub}</div>
              </div>
            </div>
            <div style={styles.cardBody}>{ws.desc}</div>
            <div style={styles.tags}>
              {ws.tags.map(t => {
                const c = techColorMap[t] || { bg: 'rgba(100,100,140,0.1)', color: colors.textDim };
                return <span key={t} style={shared.tag(c.bg, c.color)}>{t}</span>;
              })}
              <span style={shared.tag('rgba(0,230,138,0.15)', colors.accentGreen)}>{ws.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Platform Stack */}
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          🔗 Platform Stack <span style={shared.badge}>9 platforms</span>
        </div>
      </div>
      <div style={styles.platformGrid}>
        {platformsQuick.map((p, i) => (
          <div
            key={p.name}
            style={{
              ...styles.platformCard,
              ...(hoveredCard === `plat-${i}` ? shared.cardHover : {}),
            }}
            onMouseEnter={() => setHoveredCard(`plat-${i}`)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={styles.platformLogo}>{p.emoji}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>{p.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
