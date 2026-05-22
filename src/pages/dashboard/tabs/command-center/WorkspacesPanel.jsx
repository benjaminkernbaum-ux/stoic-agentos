import { useState } from 'react';
import { colors, shared, statusTag } from './styles';

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
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: colors.textDim,
  },
};

export default function WorkspacesPanel({ workspaces = [] }) {
  const [hoveredRow, setHoveredRow] = useState(null);

  return (
    <div>
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          📂 Workspaces <span style={shared.badge}>{workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {workspaces.length > 0 ? (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}></th>
              <th style={styles.th}>Workspace</th>
              <th style={styles.th}>Branch</th>
              <th style={styles.th}>Stack</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((ws, i) => (
              <tr
                key={ws.id}
                onMouseEnter={() => setHoveredRow(i)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td style={{
                  ...styles.td,
                  ...styles.tdFirst,
                  background: hoveredRow === i ? colors.bgCardHover : colors.bgCard,
                }}>
                  <span style={{ fontSize: 18 }}>📦</span>
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
                  {ws.branch || 'main'}
                </td>
                <td style={{
                  ...styles.td,
                  background: hoveredRow === i ? colors.bgCardHover : colors.bgCard,
                }}>
                  {ws.stack || '—'}
                </td>
                <td style={{
                  ...styles.td,
                  ...styles.tdLast,
                  background: hoveredRow === i ? colors.bgCardHover : colors.bgCard,
                }}>
                  <span style={statusTag('active')}>Active</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <h3 style={{ color: colors.textSecondary, marginBottom: 8 }}>No workspaces connected</h3>
          <p>Add workspaces from the Workspaces tab to see them here.</p>
        </div>
      )}
    </div>
  );
}
