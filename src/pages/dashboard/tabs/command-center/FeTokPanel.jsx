import { colors, shared } from './styles';

const styles = {
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
    color: colors.textDim,
  },
  wrapper: {
    background: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
};

export default function FeTokPanel() {
  return (
    <div>
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          🎬 Content Pipeline <span style={shared.badge}>Coming Soon</span>
        </div>
      </div>

      <div style={styles.wrapper}>
        <div style={styles.emptyState}>
          <div style={{ fontSize: 64, marginBottom: 20, opacity: 0.3 }}>🎬</div>
          <h3 style={{ color: colors.textSecondary, marginBottom: 10, fontSize: 18 }}>
            Content Pipeline
          </h3>
          <p style={{ maxWidth: 400, margin: '0 auto', lineHeight: 1.6, fontSize: 13 }}>
            Manage your content creation pipeline, video rendering queue, and publishing workflows.
            This feature will be available in a future update.
          </p>
          <div style={{
            marginTop: 20, padding: '8px 20px', borderRadius: 8,
            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
            fontSize: 12, color: '#fbbf24', display: 'inline-block',
          }}>
            🚧 Under Development
          </div>
        </div>
      </div>
    </div>
  );
}
