/**
 * Shared styles and design tokens for the Command Center panels.
 * v3 — Neutral zinc, Vercel/Linear grade
 */

export const colors = {
  bgPrimary: '#09090b',
  bgSecondary: '#0a0a0c',
  bgCard: '#111114',
  bgCardHover: '#18181b',
  border: 'rgba(255,255,255,0.06)',
  borderGlow: 'rgba(255,255,255,0.14)',
  textPrimary: '#fafafa',
  textSecondary: 'rgba(161,161,170,0.85)',
  textDim: 'rgba(113,113,122,0.65)',
  accentBlue: '#a78bfa',
  accentCyan: '#a78bfa',
  accentPurple: '#a78bfa',
  accentGreen: '#22c55e',
  accentOrange: '#f59e0b',
  accentRed: '#ef4444',
  accentPink: '#a78bfa',
  accentGold: '#f59e0b',
  accentIndigo: '#a78bfa',
  obPurple: '#7c3aed',
  obViolet: '#a78bfa',
};

export const gradients = {
  hero: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
  card: '#111114',
};

export const shared = {
  card: {
    background: '#111114',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 20,
    transition: 'all 0.15s ease',
    cursor: 'default',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHover: {
    borderColor: 'rgba(255,255,255,0.14)',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: -0.3,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: '#fafafa',
  },
  badge: {
    padding: '3px 10px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 500,
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(161,161,170,0.85)',
  },
  tag: (bg, color) => ({
    padding: '3px 10px',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    background: bg,
    color,
    border: 'none',
  }),
  label: {
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: 0.06,
    color: 'rgba(113,113,122,0.65)',
    marginBottom: 8,
  },
  grid: (minWidth = 280) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
    gap: 16,
    marginBottom: 28,
  }),
};

export function statusTag(status) {
  const map = {
    active: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
    live: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
    connected: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
    deployed: { bg: 'rgba(167,139,250,0.1)', color: '#a78bfa' },
    idle: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
    pending: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
    running: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
    disconnected: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
    error: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
    planned: { bg: 'rgba(113,113,122,0.1)', color: 'rgba(113,113,122,0.65)' },
  };
  const s = map[status] || map.planned;
  return shared.tag(s.bg, s.color);
}
