import { colors, shared } from './styles';

const styles = {
  wrapper: {
    background: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    overflow: 'hidden',
    height: '75vh',
    position: 'relative',
  },
  embedHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: colors.bgCard,
    borderBottom: `1px solid ${colors.border}`,
  },
  embedUrl: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    color: colors.textDim,
    padding: '4px 12px',
    background: colors.bgPrimary,
    borderRadius: 6,
    border: `1px solid ${colors.border}`,
  },
  actions: {
    display: 'flex',
    gap: 8,
  },
  btn: {
    padding: '6px 14px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    border: `1px solid ${colors.border}`,
    background: colors.bgPrimary,
    color: colors.textSecondary,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  iframe: {
    width: '100%',
    height: 'calc(100% - 50px)',
    border: 'none',
  },
};

export default function KnowledgeGraphPanel() {
  return (
    <div>
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          🕸️ Knowledge Graph{' '}
          <span style={shared.badge}>124 nodes · 235 edges · 12 communities</span>
        </div>
      </div>

      <div style={styles.embedHeader}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>📊 Graphify — Interactive Codebase Graph</span>
        <div style={styles.actions}>
          <span style={styles.embedUrl}>graphify-out/graph.html</span>
          <button
            style={styles.btn}
            onClick={() => window.open('/graphify-out/graph.html', '_blank')}
            onMouseEnter={e => { e.currentTarget.style.borderColor = colors.accentBlue; e.currentTarget.style.color = colors.textPrimary; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.textSecondary; }}
          >
            ↗ Open Full
          </button>
        </div>
      </div>
      <div style={styles.wrapper}>
        <iframe
          src="/graphify-out/graph.html"
          title="Knowledge Graph"
          style={styles.iframe}
          loading="lazy"
        />
      </div>
    </div>
  );
}
