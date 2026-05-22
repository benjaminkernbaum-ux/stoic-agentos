import { colors, shared } from './styles';

const AVAILABLE_PLATFORMS = [
  { icon: '🐙', name: 'GitHub', desc: 'Source control & CI/CD pipelines', tags: ['Git', 'Actions'] },
  { icon: '▲', name: 'Vercel', desc: 'Frontend hosting & edge functions', tags: ['Edge', 'CDN'] },
  { icon: '⚡', name: 'Supabase', desc: 'PostgreSQL database + Auth + RLS', tags: ['PostgreSQL', 'Auth'] },
  { icon: '🔧', name: 'n8n', desc: 'Low-code workflow automation', tags: ['Workflows', 'Webhooks'] },
  { icon: '🚂', name: 'Railway', desc: 'Cloud hosting for services & bots', tags: ['Docker', 'Cloud'] },
  { icon: '✈️', name: 'Telegram API', desc: 'Bot & channel notifications', tags: ['Bot API', 'Webhook'] },
  { icon: '💳', name: 'Stripe', desc: 'Payment processing & subscriptions', tags: ['Payments', 'Webhooks'] },
];

const styles = {
  cardIcon: (bg) => ({
    width: 44, height: 44, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, flexShrink: 0, background: bg,
  }),
  cardHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: 700, letterSpacing: -0.3 },
  cardBody: { fontSize: 12, color: colors.textSecondary, lineHeight: 1.6 },
  tags: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 },
  comingSoon: {
    fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: 1, color: colors.textDim,
    padding: '3px 8px', borderRadius: 6,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${colors.border}`,
    marginLeft: 'auto',
  },
};

export default function PlatformsPanel() {
  return (
    <div>
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          🔗 Available Integrations <span style={shared.badge}>Connect your stack</span>
        </div>
      </div>

      <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 1.6 }}>
        Platform integrations will be available in a future update. Below are the platforms AgentOS will support.
      </div>

      <div style={shared.grid(280)}>
        {AVAILABLE_PLATFORMS.map(p => (
          <div key={p.name} style={{ ...shared.card, opacity: 0.7 }}>
            <div style={styles.cardHeader}>
              <div style={styles.cardIcon('rgba(255,255,255,0.04)')}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={styles.cardTitle}>{p.name}</div>
              </div>
              <span style={styles.comingSoon}>Soon</span>
            </div>
            <div style={styles.cardBody}>{p.desc}</div>
            <div style={styles.tags}>
              {p.tags.map(t => (
                <span key={t} style={shared.tag('rgba(77, 124, 255, 0.1)', colors.accentBlue)}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
