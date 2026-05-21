import { useState } from 'react';
import { colors, shared } from './styles';

const roteiros = [
  { id: 'cego', emoji: '👁️', titulo: 'O Cego que Viu Deus', verse: 'João 9:25', shots: 8, hook: 'Ele nunca viu a LUZ. Até que Jesus fez ISSO 🕊️' },
  { id: 'poco', emoji: '💧', titulo: 'A Mulher no Poço', verse: 'João 4:14', shots: 8, hook: 'Ela era a FOFOCA da cidade inteira 😢' },
  { id: 'pedro_mar', emoji: '🌊', titulo: 'Pedro Afundando', verse: 'Mateus 14:31', shots: 8, hook: '3 SEGUNDOS. Foi o tempo que a fé dele durou ⚡' },
  { id: 'lazaro', emoji: '⚰️', titulo: 'Lázaro — 4 Dias Morto', verse: 'João 11:43', shots: 7, hook: 'Todo mundo desistiu. Jesus chegou 4 dias ATRASADO 😭' },
  { id: 'ladrao', emoji: '✝️', titulo: 'O Ladrão na Cruz', verse: 'Lucas 23:43', shots: 7, hook: 'Ele matou, roubou, e morreu ao lado de DEUS 😭' },
  { id: 'pes', emoji: '🧎', titulo: 'Jesus Lava os Pés', verse: 'João 13:14', shots: 6, hook: 'O REI do universo AJOELHOU no chão 👑' },
  { id: 'golias', emoji: '🪨', titulo: 'Davi vs Golias', verse: '1 Samuel 17:45', shots: 7, hook: '1 PEDRA contra um gigante de 3 METROS 🪨' },
  { id: 'daniel', emoji: '🦁', titulo: 'Daniel na Cova dos Leões', verse: 'Daniel 6:22', shots: 6, hook: 'Jogaram ele pros LEÕES. Deus mandou os leões DORMIR 🦁' },
  { id: 'viuva', emoji: '🫗', titulo: 'A Viúva e o Azeite', verse: '2 Reis 4:6', shots: 6, hook: 'Ela só tinha 1 GOTA. Deus encheu a casa INTEIRA 🫗' },
  { id: 'tempestade', emoji: '⛈️', titulo: 'Jesus Acalma a Tempestade', verse: 'Marcos 4:39', shots: 7, hook: 'A NATUREZA obedeceu a voz dele ⚡' },
];

const pipelineStages = [
  { emoji: '📝', label: 'Script', status: 'done', count: 10 },
  { emoji: '🎙️', label: 'TTS', status: 'done', count: 10 },
  { emoji: '🎨', label: 'Visuals', status: 'in-progress', count: 7 },
  { emoji: '🎬', label: 'Assembly', status: 'pending', count: 4 },
  { emoji: '📤', label: 'Upload', status: 'pending', count: 2 },
];

const gold = '#fbbf24';
const goldDark = '#d97706';

const styles = {
  hero: {
    background: `linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(217,119,6,0.08) 50%, rgba(245,158,11,0.12) 100%)`,
    border: `1px solid rgba(251,191,36,0.2)`,
    borderRadius: 16,
    padding: '28px 32px',
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  heroTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: `linear-gradient(90deg, ${gold}, #f59e0b, ${goldDark}, #f59e0b, ${gold})`,
  },
  heroInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 20,
  },
  heroLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  heroLogo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    background: `linear-gradient(135deg, ${gold} 0%, ${goldDark} 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
    boxShadow: `0 8px 32px rgba(251,191,36,0.25)`,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: -0.5,
    background: `linear-gradient(135deg, #fde68a 0%, ${gold} 50%, ${goldDark} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
  },
  stat: {
    textAlign: 'center',
    padding: '8px 18px',
    background: 'rgba(251,191,36,0.08)',
    border: '1px solid rgba(251,191,36,0.15)',
    borderRadius: 12,
    minWidth: 90,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 800,
    fontFamily: "'JetBrains Mono', monospace",
    color: gold,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textDim,
    marginTop: 2,
  },
  roteiroGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 14,
    marginBottom: 24,
  },
  card: (isHovered) => ({
    background: 'linear-gradient(145deg, #16161f 0%, #1a1a25 100%)',
    border: `1px solid ${isHovered ? 'rgba(251,191,36,0.3)' : colors.border}`,
    borderRadius: 16,
    padding: 18,
    transition: 'all 0.3s',
    position: 'relative',
    overflow: 'hidden',
    transform: isHovered ? 'translateY(-2px)' : 'none',
    boxShadow: isHovered ? '0 12px 40px rgba(251,191,36,0.08)' : 'none',
  }),
  cardTopBar: (isHovered) => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: `linear-gradient(90deg, ${gold}, ${goldDark})`,
    opacity: isHovered ? 1 : 0,
    transition: 'opacity 0.3s',
  }),
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  cardEmoji: {
    fontSize: 28,
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(251,191,36,0.08)',
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#f3f0ff',
  },
  cardVerse: {
    fontSize: 11,
    color: goldDark,
    fontWeight: 600,
    marginTop: 2,
  },
  cardHook: {
    fontSize: 12,
    color: '#c4b5fd',
    lineHeight: 1.5,
    fontStyle: 'italic',
    borderLeft: '3px solid rgba(251,191,36,0.3)',
    paddingLeft: 10,
    marginBottom: 10,
  },
  cardFoot: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shotsBadge: {
    fontSize: 11,
    color: colors.textDim,
    background: 'rgba(255,255,255,0.04)',
    padding: '3px 10px',
    borderRadius: 12,
  },
  statusBadge: {
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 12,
    fontWeight: 600,
    background: 'rgba(16,185,129,0.15)',
    color: '#34d399',
  },
  pipeline: {
    display: 'flex',
    gap: 12,
    marginBottom: 24,
  },
  pipelineStage: (status) => ({
    flex: 1,
    padding: 16,
    background: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    textAlign: 'center',
    borderTop: `3px solid ${
      status === 'done' ? colors.accentGreen :
      status === 'in-progress' ? gold :
      colors.textDim
    }`,
  }),
};

export default function FeTokPanel() {
  const [hovered, setHovered] = useState(null);

  return (
    <div>
      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroTopBar} />
        <div style={styles.heroInner}>
          <div style={styles.heroLeft}>
            <div style={styles.heroLogo}>🎬</div>
            <div>
              <div style={styles.heroTitle}>FéTok — Série 6 Cinematográfica Jesus</div>
              <div style={styles.heroSub}>HIGH VIRAL Content Pipeline • @luz.da.palavra.oficial • TikTok + Instagram</div>
            </div>
          </div>
          <div style={styles.statsRow}>
            <div style={styles.stat}><div style={styles.statValue}>10</div><div style={styles.statLabel}>Roteiros</div></div>
            <div style={styles.stat}><div style={styles.statValue}>70</div><div style={styles.statLabel}>Shots</div></div>
            <div style={styles.stat}><div style={styles.statValue}>10</div><div style={styles.statLabel}>Soul IDs</div></div>
            <div style={styles.stat}><div style={styles.statValue}>4×</div><div style={styles.statLabel}>Posts/Dia</div></div>
          </div>
        </div>
      </div>

      {/* Pipeline Status */}
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          🖥️ Pipeline Status{' '}
          <span style={{ ...shared.badge, background: 'rgba(251,191,36,0.12)', color: gold }}>Live</span>
        </div>
      </div>
      <div style={styles.pipeline}>
        {pipelineStages.map(stage => (
          <div key={stage.label} style={styles.pipelineStage(stage.status)}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{stage.emoji}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary }}>{stage.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: gold, marginTop: 4 }}>{stage.count}</div>
          </div>
        ))}
      </div>

      {/* Roteiros Grid */}
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          📜 Roteiros — Série 6{' '}
          <span style={{ ...shared.badge, background: 'rgba(251,191,36,0.12)', color: gold }}>10 Cinematic Stories</span>
        </div>
      </div>
      <div style={styles.roteiroGrid}>
        {roteiros.map((r, i) => (
          <div
            key={r.id}
            style={styles.card(hovered === i)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={styles.cardTopBar(hovered === i)} />
            <div style={styles.cardHead}>
              <div style={styles.cardEmoji}>{r.emoji}</div>
              <div>
                <div style={styles.cardTitle}>{r.titulo}</div>
                <div style={styles.cardVerse}>📖 {r.verse}</div>
              </div>
            </div>
            <div style={styles.cardHook}>"{r.hook}"</div>
            <div style={styles.cardFoot}>
              <span style={styles.shotsBadge}>🎬 {r.shots} shots</span>
              <span style={styles.statusBadge}>✅ Ready</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
