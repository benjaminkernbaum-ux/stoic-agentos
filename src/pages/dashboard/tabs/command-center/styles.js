/**
 * Shared styles and design tokens for the Command Center panels.
 * Mirrors the CSS variables from the legacy command-center.html.
 */

export const colors = {
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgCard: '#16161f',
  bgCardHover: '#1c1c28',
  border: '#1e1e2e',
  borderGlow: '#2a2a3e',
  textPrimary: '#e8e8f0',
  textSecondary: '#8888a0',
  textDim: '#555570',
  accentBlue: '#4d7cff',
  accentCyan: '#00d4ff',
  accentPurple: '#9b59ff',
  accentGreen: '#00e68a',
  accentOrange: '#ff9f43',
  accentRed: '#ff4757',
  accentPink: '#ff6b9d',
  accentGold: '#ffd700',
  accentIndigo: '#6366f1',
  obPurple: '#7c3aed',
  obViolet: '#a855f7',
};

export const gradients = {
  hero: 'linear-gradient(135deg, #4d7cff 0%, #9b59ff 50%, #ff6b9d 100%)',
  card: 'linear-gradient(145deg, #16161f 0%, #1a1a25 100%)',
};

export const shared = {
  card: {
    background: gradients.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 20,
    transition: 'all 0.3s',
    cursor: 'default',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHover: {
    borderColor: colors.borderGlow,
    transform: 'translateY(-2px)',
    boxShadow: `0 0 30px rgba(77, 124, 255, 0.15)`,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: -0.5,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    padding: '4px 12px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    background: 'rgba(77, 124, 255, 0.12)',
    color: colors.accentBlue,
  },
  tag: (bg, color) => ({
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    background: bg,
    color,
    border: `1px solid ${color}33`,
  }),
  label: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textDim,
    marginBottom: 8,
  },
  grid: (minWidth = 280) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
    gap: 16,
    marginBottom: 28,
  }),
};

/**
 * Utility: returns inline style for a status tag.
 */
export function statusTag(status) {
  const map = {
    active: { bg: 'rgba(0, 230, 138, 0.15)', color: colors.accentGreen },
    live: { bg: 'rgba(0, 230, 138, 0.15)', color: colors.accentGreen },
    connected: { bg: 'rgba(0, 230, 138, 0.15)', color: colors.accentGreen },
    deployed: { bg: 'rgba(77, 124, 255, 0.15)', color: colors.accentBlue },
    idle: { bg: 'rgba(255, 159, 67, 0.15)', color: colors.accentOrange },
    pending: { bg: 'rgba(255, 159, 67, 0.15)', color: colors.accentOrange },
    disconnected: { bg: 'rgba(255, 71, 87, 0.15)', color: colors.accentRed },
    error: { bg: 'rgba(255, 71, 87, 0.15)', color: colors.accentRed },
    planned: { bg: 'rgba(85, 85, 112, 0.15)', color: colors.textDim },
  };
  const s = map[status] || map.planned;
  return shared.tag(s.bg, s.color);
}
