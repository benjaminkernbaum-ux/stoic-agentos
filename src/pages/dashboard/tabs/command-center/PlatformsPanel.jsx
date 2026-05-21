import { useState } from 'react';
import { colors, shared, statusTag } from './styles';

const platforms = [
  { icon: '🐙', name: 'GitHub', bg: 'rgba(255,255,255,0.06)', status: 'connected', desc: 'Source control, CI/CD pipelines, deploy workflows. Main repo: benjaminkernbaum-ux/StoicHub', tags: ['Git', 'Actions', 'CI/CD'], url: 'https://github.com/benjaminkernbaum-ux' },
  { icon: '🚂', name: 'Railway', bg: 'rgba(155,89,255,0.12)', status: 'connected', desc: 'Cloud hosting for StoicBot (24/7), stoic-factory content engine, n8n orchestrator. Auto-deploy from GitHub.', tags: ['Docker', 'Cloud', 'Auto-Deploy'] },
  { icon: '▲', name: 'Vercel', bg: 'rgba(255,255,255,0.06)', status: 'connected', desc: 'SaaS Hub frontend (React/Vite). Edge functions, serverless API. Auto-deploy on push to main.', tags: ['Edge', 'Serverless', 'CDN'] },
  { icon: '⚡', name: 'Supabase', bg: 'rgba(0,230,138,0.12)', status: 'connected', desc: 'PostgreSQL database with Row-Level Security. Auth, real-time subscriptions, storage. Multi-tenant CRM data.', tags: ['PostgreSQL', 'RLS', 'Auth'] },
  { icon: '🔧', name: 'n8n', bg: 'rgba(255,159,67,0.12)', status: 'connected', desc: '31 workflow automations: content → finance → security → CRM. Low-code visual orchestration on Railway Docker.', tags: ['Low-Code', 'Workflows', 'Docker'] },
  { icon: '✈️', name: 'Telegram API', bg: 'rgba(0,212,255,0.12)', status: 'connected', desc: 'StoicBot 24/7, content channel (Stoic Academy), notification system, group interactions, polls.', tags: ['Bot API', 'Channel', 'Webhook'] },
  { icon: '📸', name: 'Instagram API', bg: 'rgba(255,107,157,0.12)', status: 'connected', desc: 'Auto-posting via instagrapi. Content renders (1080×1080), caption generation, Reels upload.', tags: ['instagrapi', 'Reels', 'Auto-Post'] },
  { icon: '🎵', name: 'TikTok', bg: 'rgba(255,255,255,0.06)', status: 'connected', desc: 'Biblical cinematic reels. LuzDaPalavra channel. stoic-factory auto-upload pipeline.', tags: ['Reels', 'FYP', 'Auto-Upload'] },
  { icon: '📊', name: 'MetaTrader 5', bg: 'rgba(255,215,0,0.12)', status: 'connected', desc: 'Larry Williams 9.1 D1 EA. Live trading on Forex. OnTick() signals → Telegram alerts.', tags: ['MQL5', 'EA', 'Forex'] },
  { icon: '🤖', name: 'Claude API', bg: 'rgba(155,89,255,0.12)', status: 'connected', desc: 'AI backbone — content generation, analysis, auto-reply, SEO, ad copy, financial summaries.', tags: ['Sonnet', 'Haiku', 'Opus'] },
  { icon: '🎙️', name: 'ElevenLabs', bg: 'rgba(0,212,255,0.12)', status: 'connected', desc: 'Text-to-speech narration for biblical stories. Portuguese (PT-BR) Antonio voice.', tags: ['TTS', 'PT-BR', 'Pipeline'] },
  { icon: '🎬', name: 'Fal.ai / Higgsfield', bg: 'rgba(77,124,255,0.12)', status: 'connected', desc: 'AI video generation. Keyframe generation (Flux) + animation (Minimax/Higgsfield Soul).', tags: ['Video AI', 'Keyframes', 'Animation'] },
  { icon: '💳', name: 'Stripe', bg: 'rgba(77,124,255,0.12)', status: 'connected', desc: 'Payment processing, subscription management, revenue tracking. Feeds into Finance dept agents.', tags: ['Payments', 'Subs', 'Webhooks'] },
  { icon: '📋', name: 'Google Sheets', bg: 'rgba(0,230,138,0.12)', status: 'connected', desc: 'KPI tracking, ledger sync, forecast scenarios, tax calculations. Finance agent outputs.', tags: ['KPIs', 'Ledger', 'Reports'] },
];

const styles = {
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
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: -0.3,
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
};

export default function PlatformsPanel() {
  const [hovered, setHovered] = useState(null);

  return (
    <div>
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          🔗 Platform Integrations <span style={shared.badge}>Full Stack</span>
        </div>
      </div>

      <div style={shared.grid(280)}>
        {platforms.map((p, i) => (
          <div
            key={p.name}
            style={{
              ...shared.card,
              cursor: p.url ? 'pointer' : 'default',
              ...(hovered === i ? shared.cardHover : {}),
            }}
            onClick={() => p.url && window.open(p.url, '_blank')}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={styles.cardHeader}>
              <div style={styles.cardIcon(p.bg)}>{p.icon}</div>
              <div>
                <div style={styles.cardTitle}>{p.name}</div>
                <div style={{ marginTop: 4 }}>
                  <span style={statusTag(p.status)}>{p.status}</span>
                </div>
              </div>
            </div>
            <div style={styles.cardBody}>{p.desc}</div>
            <div style={styles.tags}>
              {p.tags.map(t => (
                <span
                  key={t}
                  style={shared.tag('rgba(77, 124, 255, 0.15)', colors.accentBlue)}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
