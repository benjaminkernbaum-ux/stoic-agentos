import { useState } from 'react';
import { colors, shared, statusTag } from './styles';

const regions = [
  { emoji: '🇧🇷', name: 'São Paulo (BR)', zone: 'sa-east-1', services: ['StoicBot', 'stoic-factory', 'n8n'], status: 'active', latency: '12ms' },
  { emoji: '🇺🇸', name: 'US East (Virginia)', zone: 'us-east-1', services: ['Vercel Edge', 'SaaS Hub CDN'], status: 'active', latency: '45ms' },
  { emoji: '🇺🇸', name: 'US West (Oregon)', zone: 'us-west-2', services: ['Supabase', 'Database backups'], status: 'active', latency: '82ms' },
  { emoji: '🇩🇪', name: 'Frankfurt (EU)', zone: 'eu-central-1', services: ['Railway (EU mirror)'], status: 'idle', latency: '130ms' },
  { emoji: '🇯🇵', name: 'Tokyo (AP)', zone: 'ap-northeast-1', services: ['CDN Edge'], status: 'idle', latency: '210ms' },
  { emoji: '🌍', name: 'Cloudflare Edge', zone: 'global', services: ['DNS', 'DDoS Protection', 'WAF'], status: 'active', latency: '<5ms' },
];

const deployTargets = [
  { name: 'Railway', icon: '🚂', deployments: 4, status: 'active', region: 'São Paulo' },
  { name: 'Vercel', icon: '▲', deployments: 2, status: 'active', region: 'US East Edge' },
  { name: 'Supabase', icon: '⚡', deployments: 1, status: 'active', region: 'US West' },
  { name: 'Cloudflare', icon: '☁️', deployments: 3, status: 'active', region: 'Global Edge' },
];

const styles = {
  regionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 14,
    marginBottom: 28,
  },
  regionCard: (isHovered) => ({
    ...shared.card,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    ...(isHovered ? shared.cardHover : {}),
  }),
  regionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  regionEmoji: {
    fontSize: 28,
  },
  regionName: {
    fontSize: 14,
    fontWeight: 700,
  },
  regionZone: {
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    color: colors.textDim,
    marginTop: 2,
  },
  serviceList: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  serviceTag: {
    padding: '3px 10px',
    borderRadius: 8,
    fontSize: 10,
    fontWeight: 600,
    background: 'rgba(77, 124, 255, 0.1)',
    color: colors.accentBlue,
    border: '1px solid rgba(77, 124, 255, 0.15)',
  },
  latencyBadge: (latency) => ({
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    color: parseInt(latency) < 50 ? colors.accentGreen : parseInt(latency) < 150 ? colors.accentOrange : colors.accentRed,
  }),
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deployGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: 14,
    marginBottom: 28,
  },
  deployCard: (isHovered) => ({
    ...shared.card,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    ...(isHovered ? shared.cardHover : {}),
  }),
  deployIcon: {
    fontSize: 28,
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.04)',
  },
  deployCount: {
    fontSize: 20,
    fontWeight: 800,
    fontFamily: "'JetBrains Mono', monospace",
    color: colors.accentCyan,
  },
};

export default function GeoOpsPanel() {
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [hoveredDeploy, setHoveredDeploy] = useState(null);

  return (
    <div>
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          🌍 GeoOps — Geographic Operations{' '}
          <span style={{ ...shared.badge, background: 'rgba(0,212,255,0.12)', color: colors.accentCyan }}>6 Regions</span>
        </div>
      </div>

      {/* Regions */}
      <div style={styles.regionGrid}>
        {regions.map((region, i) => (
          <div
            key={region.zone}
            style={styles.regionCard(hoveredRegion === i)}
            onMouseEnter={() => setHoveredRegion(i)}
            onMouseLeave={() => setHoveredRegion(null)}
          >
            <div style={styles.regionHeader}>
              <span style={styles.regionEmoji}>{region.emoji}</span>
              <div>
                <div style={styles.regionName}>{region.name}</div>
                <div style={styles.regionZone}>{region.zone}</div>
              </div>
            </div>
            <div style={styles.serviceList}>
              {region.services.map(svc => (
                <span key={svc} style={styles.serviceTag}>{svc}</span>
              ))}
            </div>
            <div style={styles.footer}>
              <span style={statusTag(region.status)}>{region.status}</span>
              <span style={styles.latencyBadge(region.latency)}>⚡ {region.latency}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Deploy Targets */}
      <div style={shared.sectionHeader}>
        <div style={shared.sectionTitle}>
          🚀 Deploy Targets{' '}
          <span style={shared.badge}>Active Infrastructure</span>
        </div>
      </div>
      <div style={styles.deployGrid}>
        {deployTargets.map((dt, i) => (
          <div
            key={dt.name}
            style={styles.deployCard(hoveredDeploy === i)}
            onMouseEnter={() => setHoveredDeploy(i)}
            onMouseLeave={() => setHoveredDeploy(null)}
          >
            <div style={styles.deployIcon}>{dt.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{dt.name}</div>
              <div style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>{dt.region}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={styles.deployCount}>{dt.deployments}</div>
              <div style={{ fontSize: 10, color: colors.textDim }}>services</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
