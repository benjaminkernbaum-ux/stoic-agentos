import { useState } from 'react';
import { colors, shared, statusTag } from './styles';

const workspaces = [
  { emoji: '🎬', name: 'LuzDaPalavra', domain: 'Biblical videos, TikTok, Higgsfield, stoic-factory', stack: 'Python, Node.js, FFmpeg', path: 'c:\\Users\\benja\\LuzDaPalavra\\', status: 'active' },
  { emoji: '📊', name: 'StoicCRM', domain: 'CRM, SaaS Hub, n8n, email, stoic-jarvis', stack: 'React, Python, Docker', path: 'c:\\Users\\benja\\StoicCRM\\', status: 'active' },
  { emoji: '📈', name: 'StoicTrading', domain: 'Forex EA, live quotes, TradingView', stack: 'MQL5, Python', path: 'c:\\Users\\benja\\StoicTrading\\', status: 'live' },
  { emoji: '🤖', name: 'TelegramBots', domain: 'Telegram bot projects', stack: 'TypeScript, Node.js', path: 'c:\\Users\\benja\\TelegramBots\\', status: 'live' },
  { emoji: '📣', name: 'GTM-Pipelines', domain: 'AdSpy, SEO factory, Viralizer, Newsletter', stack: 'Python, Claude API', path: 'c:\\Users\\benja\\GTM-Pipelines\\', status: 'active' },
  { emoji: '🐟', name: 'FishFinder', domain: 'Fish identification app', stack: 'React, TensorFlow', path: 'c:\\Users\\benja\\FishFinder\\', status: 'planned' },
  { emoji: '👴', name: 'Automacoes-Papai', domain: "Dad's PowerShell automations", stack: 'PowerShell', path: 'c:\\Users\\benja\\Automacoes-Papai\\', status: 'deployed' },
  { emoji: '🚂', name: 'RailwayBounty', domain: 'Railway bounty solver', stack: 'Node.js', path: 'c:\\Users\\benja\\RailwayBounty\\', status: 'pending' },
  { emoji: '🔒', name: 'CyberArmor', domain: 'Security monitor, prompt hardening', stack: 'Python', path: 'c:\\Users\\benja\\CyberArmor\\', status: 'deployed' },
  { emoji: '🐋', name: 'WhaleTracker', domain: 'Smart Money Intelligence Terminal', stack: 'Python, React', path: 'c:\\Users\\benja\\WhaleTracker\\', status: 'pending' },
  { emoji: '🏠', name: 'Comunidade Stoic', domain: 'Hub: brand-vault, agent-ops, workflows', stack: 'Markdown, PS1, JS', path: 'c:\\Users\\benja\\Comunidade stoic\\', status: 'live' },
];

const styles = {
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0 4px',
    marginBottom: 28,
  },
  th: {
    textAlign: 'left',
    padding: '10px 16px',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.textDim,
  },
  td: {
    padding: '14px 16px',
    background: colors.bgCard,
    borderTop: `1px solid ${colors.border}`,
    borderBottom: `1px solid ${colors.border}`,
    fontSize: 13,
    transition: 'all 0.2s',
  },
  tdFirst: {
    borderLeft: `1px solid ${colors.border}`,
    borderRadius: '10px 0 0 10px',
  },
  tdLast: {
    borderRight: `1px solid ${colors.border}`,
    borderRadius: '0 10px 10px 0',
  },
  wsPath: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: colors.textDim,
  },
  wsIcon: {
    fontSize: 18,
    marginRight: 8,
  },
};

export default function WorkspacesPanel() {
  const [hoveredRow, setHoveredRow] = useState(null);

  return (
    <div>
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          📂 Workspace DNS <span style={shared.badge}>11 dedicated workspaces</span>
        </div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}></th>
            <th style={styles.th}>Workspace</th>
            <th style={styles.th}>Domain</th>
            <th style={styles.th}>Stack</th>
            <th style={styles.th}>Path</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {workspaces.map((ws, i) => (
            <tr
              key={ws.name}
              onMouseEnter={() => setHoveredRow(i)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td style={{
                ...styles.td,
                ...styles.tdFirst,
                background: hoveredRow === i ? colors.bgCardHover : colors.bgCard,
              }}>
                <span style={styles.wsIcon}>{ws.emoji}</span>
              </td>
              <td style={{
                ...styles.td,
                background: hoveredRow === i ? colors.bgCardHover : colors.bgCard,
              }}>
                <strong>{ws.name}</strong>
              </td>
              <td style={{
                ...styles.td,
                background: hoveredRow === i ? colors.bgCardHover : colors.bgCard,
              }}>
                {ws.domain}
              </td>
              <td style={{
                ...styles.td,
                background: hoveredRow === i ? colors.bgCardHover : colors.bgCard,
              }}>
                {ws.stack}
              </td>
              <td style={{
                ...styles.td,
                background: hoveredRow === i ? colors.bgCardHover : colors.bgCard,
              }}>
                <span style={styles.wsPath}>{ws.path}</span>
              </td>
              <td style={{
                ...styles.td,
                ...styles.tdLast,
                background: hoveredRow === i ? colors.bgCardHover : colors.bgCard,
              }}>
                <span style={statusTag(ws.status)}>{ws.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
