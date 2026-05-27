/**
 * ═══════════════════════════════════════════════════
 *  SkeletonLoader — Premium loading placeholders
 *  CSS-only pulse + shimmer, glassmorphism cards
 *  Uses existing design system from Dashboard.css
 * ═══════════════════════════════════════════════════
 */

/* ── Stat Card Skeleton ── */
export function SkeletonStatCard() {
  return (
    <div className="skel-stat-card">
      <div className="skel-row" style={{ gap: 8, marginBottom: 14 }}>
        <div className="skel-box" style={{ width: 32, height: 32, borderRadius: 8 }} />
        <div style={{ marginLeft: 'auto' }}>
          <div className="skel-box" style={{ width: 42, height: 16, borderRadius: 4 }} />
        </div>
      </div>
      <div className="skel-box" style={{ width: '55%', height: 34, borderRadius: 6, marginBottom: 6 }} />
      <div className="skel-box" style={{ width: '40%', height: 10, borderRadius: 3, marginBottom: 6 }} />
      <div className="skel-row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <div className="skel-box" style={{ width: '45%', height: 8, borderRadius: 3 }} />
        <div className="skel-box" style={{ width: 60, height: 22, borderRadius: 4 }} />
      </div>
    </div>
  );
}

/* ── Stat Cards Grid Skeleton ── */
export function SkeletonStatCards({ count = 4 }) {
  return (
    <div className="dash-metrics">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

/* ── Agent Row Skeleton ── */
export function SkeletonAgentRow() {
  return (
    <div className="skel-agent-row">
      <div className="skel-dot" />
      <div className="skel-box" style={{ width: '35%', height: 11, borderRadius: 3 }} />
      <div style={{ flex: 1 }} />
      <div className="skel-box" style={{ width: 52, height: 16, borderRadius: 4 }} />
      <div className="skel-box" style={{ width: 38, height: 11, borderRadius: 3 }} />
      <div className="skel-box" style={{ width: 24, height: 11, borderRadius: 3 }} />
    </div>
  );
}

/* ── Agent Rows Skeleton ── */
export function SkeletonAgentRows({ count = 5 }) {
  return (
    <div className="dash-agent-feed">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonAgentRow key={i} />
      ))}
    </div>
  );
}

/* ── Agent Card Skeleton ── */
export function SkeletonAgentCard() {
  return (
    <div className="skel-agent-card">
      <div className="skel-row" style={{ marginBottom: 14 }}>
        <div className="skel-box" style={{ width: '55%', height: 14, borderRadius: 4 }} />
        <div style={{ flex: 1 }} />
        <div className="skel-box" style={{ width: 52, height: 18, borderRadius: 4 }} />
      </div>
      <div className="skel-row" style={{ gap: 20, marginBottom: 14 }}>
        <div>
          <div className="skel-box" style={{ width: 36, height: 20, borderRadius: 4, marginBottom: 4 }} />
          <div className="skel-box" style={{ width: 26, height: 8, borderRadius: 3 }} />
        </div>
        <div>
          <div className="skel-box" style={{ width: 28, height: 20, borderRadius: 4, marginBottom: 4 }} />
          <div className="skel-box" style={{ width: 32, height: 8, borderRadius: 3 }} />
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
        <div className="skel-row">
          <div className="skel-box" style={{ width: 60, height: 16, borderRadius: 4 }} />
          <div style={{ flex: 1 }} />
          <div className="skel-box" style={{ width: 56, height: 11, borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}

/* ── Agent Cards Grid Skeleton ── */
export function SkeletonAgentCards({ count = 4 }) {
  return (
    <div className="dash-agent-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonAgentCard key={i} />
      ))}
    </div>
  );
}

/* ── Timeline / Activity Item Skeleton ── */
export function SkeletonTimelineItem() {
  return (
    <div className="skel-timeline-item">
      <div className="skel-box" style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skel-box" style={{ width: '70%', height: 12, borderRadius: 3, marginBottom: 6 }} />
        <div className="skel-row" style={{ gap: 8 }}>
          <div className="skel-box" style={{ width: 48, height: 14, borderRadius: 3 }} />
          <div className="skel-box" style={{ width: 36, height: 10, borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}

/* ── Timeline Skeleton ── */
export function SkeletonTimeline({ count = 5 }) {
  return (
    <div className="dash-timeline">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTimelineItem key={i} />
      ))}
    </div>
  );
}

/* ── Observation Row Skeleton ── */
export function SkeletonObsRow() {
  return (
    <div className="skel-obs-row">
      <div className="skel-box" style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skel-box" style={{ width: '65%', height: 13, borderRadius: 3, marginBottom: 6 }} />
        <div className="skel-box" style={{ width: '85%', height: 10, borderRadius: 3, marginBottom: 6 }} />
        <div className="skel-row" style={{ gap: 8 }}>
          <div className="skel-box" style={{ width: 56, height: 14, borderRadius: 4 }} />
          <div className="skel-box" style={{ width: 44, height: 10, borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}

/* ── Observation List Skeleton ── */
export function SkeletonObsList({ count = 4 }) {
  return (
    <div className="dash-obs-list">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonObsRow key={i} />
      ))}
    </div>
  );
}

/* ── Trace Row Skeleton ── */
export function SkeletonTraceRow() {
  return (
    <div className="skel-trace-row">
      <div className="skel-row" style={{ gap: 10, marginBottom: 8 }}>
        <div className="skel-dot" />
        <div className="skel-box" style={{ width: '40%', height: 13, borderRadius: 4 }} />
        <div style={{ flex: 1 }} />
        <div className="skel-box" style={{ width: 48, height: 16, borderRadius: 4 }} />
        <div className="skel-box" style={{ width: 38, height: 10, borderRadius: 3 }} />
        <div className="skel-box" style={{ width: 32, height: 10, borderRadius: 3 }} />
      </div>
      <div className="skel-box" style={{ width: '100%', height: 16, borderRadius: 4 }} />
    </div>
  );
}

/* ── Trace List Skeleton ── */
export function SkeletonTraceList({ count = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTraceRow key={i} />
      ))}
    </div>
  );
}

/* ── Usage Bar Skeleton ── */
export function SkeletonUsageBar() {
  return (
    <div className="skel-usage-bar">
      <div style={{ flex: 1 }}>
        <div className="skel-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="skel-box" style={{ width: 120, height: 11, borderRadius: 3 }} />
          <div className="skel-box" style={{ width: 60, height: 11, borderRadius: 3 }} />
        </div>
        <div className="skel-box" style={{ width: '100%', height: 3, borderRadius: 2 }} />
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="skel-box" style={{ width: 48, height: 18, borderRadius: 4, marginBottom: 4 }} />
        <div className="skel-box" style={{ width: 40, height: 8, borderRadius: 3 }} />
      </div>
    </div>
  );
}

/* ── Enhanced Empty State ── */
export function EmptyState({
  icon,
  title,
  description,
  steps,
  children,
  variant = 'default', // 'default' | 'traces' | 'agents' | 'brain'
}) {
  return (
    <div className={`empty-state empty-state--${variant}`}>
      <div className="empty-state__icon-wrap">
        {icon || <DefaultEmptyIcon variant={variant} />}
      </div>
      {title && <h4 className="empty-state__title">{title}</h4>}
      {description && <p className="empty-state__desc">{description}</p>}
      {steps && (
        <div className="empty-state__steps">
          {steps.map((step, i) => (
            <div key={i} className="empty-state__step">
              <span className="empty-state__step-num">{i + 1}</span>
              <span className="empty-state__step-text">{step}</span>
            </div>
          ))}
        </div>
      )}
      {children && <div className="empty-state__actions">{children}</div>}
    </div>
  );
}

/* ── Default Empty State Icons (animated SVGs) ── */
function DefaultEmptyIcon({ variant }) {
  switch (variant) {
    case 'agents':
      return (
        <svg className="empty-state__svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" stroke="url(#agentGrad)" strokeWidth="1.5" strokeDasharray="4 3" className="empty-state__svg-rotate" />
          <circle cx="32" cy="32" r="16" stroke="rgba(167,139,250,0.25)" strokeWidth="1" />
          <circle cx="32" cy="32" r="4" fill="rgba(167,139,250,0.4)" className="empty-state__svg-pulse" />
          <circle cx="32" cy="12" r="3" fill="rgba(167,139,250,0.3)" className="empty-state__svg-orbit" />
          <circle cx="52" cy="32" r="2.5" fill="rgba(124,58,237,0.3)" className="empty-state__svg-orbit" style={{ animationDelay: '1s' }} />
          <circle cx="32" cy="52" r="2" fill="rgba(196,181,252,0.3)" className="empty-state__svg-orbit" style={{ animationDelay: '2s' }} />
          <defs>
            <linearGradient id="agentGrad" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'brain':
      return (
        <svg className="empty-state__svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
          <path d="M32 8 L56 20 L56 44 L32 56 L8 44 L8 20 Z" stroke="url(#brainGrad)" strokeWidth="1.5" fill="rgba(124,58,237,0.04)" className="empty-state__svg-pulse" />
          <path d="M32 18 L46 26 L46 38 L32 46 L18 38 L18 26 Z" stroke="rgba(167,139,250,0.2)" strokeWidth="1" fill="rgba(124,58,237,0.06)" />
          <circle cx="32" cy="32" r="3" fill="rgba(167,139,250,0.5)" className="empty-state__svg-pulse" />
          <line x1="32" y1="32" x2="32" y2="8" stroke="rgba(167,139,250,0.15)" strokeWidth="0.5" />
          <line x1="32" y1="32" x2="56" y2="44" stroke="rgba(167,139,250,0.15)" strokeWidth="0.5" />
          <line x1="32" y1="32" x2="8" y2="44" stroke="rgba(167,139,250,0.15)" strokeWidth="0.5" />
          <defs>
            <linearGradient id="brainGrad" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#c4b5fd" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'traces':
      return <TracesEmptyViz />;

    default:
      return (
        <svg className="empty-state__svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="8" y="14" width="48" height="36" rx="6" stroke="url(#defaultGrad)" strokeWidth="1.5" fill="rgba(124,58,237,0.04)" />
          <line x1="8" y1="24" x2="56" y2="24" stroke="rgba(167,139,250,0.15)" strokeWidth="1" />
          <rect x="14" y="30" width="20" height="3" rx="1.5" fill="rgba(167,139,250,0.2)" className="empty-state__svg-shimmer" />
          <rect x="14" y="37" width="14" height="3" rx="1.5" fill="rgba(167,139,250,0.12)" className="empty-state__svg-shimmer" style={{ animationDelay: '0.3s' }} />
          <rect x="14" y="44" width="24" height="3" rx="1.5" fill="rgba(167,139,250,0.08)" className="empty-state__svg-shimmer" style={{ animationDelay: '0.6s' }} />
          <circle cx="14" cy="19" r="2" fill="rgba(248,113,113,0.4)" />
          <circle cx="21" cy="19" r="2" fill="rgba(251,191,36,0.4)" />
          <circle cx="28" cy="19" r="2" fill="rgba(52,199,89,0.4)" />
          <defs>
            <linearGradient id="defaultGrad" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
        </svg>
      );
  }
}

/* ── Animated Traces Visualization for Empty State ── */
export function TracesEmptyViz() {
  return (
    <svg className="empty-state__svg traces-empty-viz" width="240" height="100" viewBox="0 0 240 100" fill="none">
      {/* Background track lines */}
      <rect x="60" y="16" width="170" height="14" rx="3" fill="rgba(124,58,237,0.04)" />
      <rect x="60" y="38" width="170" height="14" rx="3" fill="rgba(124,58,237,0.04)" />
      <rect x="60" y="60" width="170" height="14" rx="3" fill="rgba(124,58,237,0.04)" />
      <rect x="60" y="82" width="170" height="14" rx="3" fill="rgba(124,58,237,0.04)" />

      {/* Span labels */}
      <text x="4" y="26" fontSize="8" fill="rgba(167,139,250,0.5)" fontFamily="monospace">LLM Call</text>
      <text x="4" y="48" fontSize="8" fill="rgba(103,232,249,0.5)" fontFamily="monospace">Tool Use</text>
      <text x="4" y="70" fontSize="8" fill="rgba(255,140,66,0.5)" fontFamily="monospace">Retrieval</text>
      <text x="4" y="92" fontSize="8" fill="rgba(167,139,250,0.5)" fontFamily="monospace">LLM Call</text>

      {/* Animated span bars */}
      <rect x="62" y="18" width="0" height="10" rx="2" fill="rgba(167,139,250,0.6)">
        <animate attributeName="width" values="0;90;90" dur="2s" begin="0.2s" fill="freeze" />
        <animate attributeName="opacity" values="0;1;0.8" dur="2s" begin="0.2s" fill="freeze" />
      </rect>
      <rect x="154" y="18" width="0" height="10" rx="2" fill="rgba(167,139,250,0.35)">
        <animate attributeName="width" values="0;55;55" dur="2s" begin="1s" fill="freeze" />
        <animate attributeName="opacity" values="0;1;0.7" dur="2s" begin="1s" fill="freeze" />
      </rect>

      <rect x="82" y="40" width="0" height="10" rx="2" fill="rgba(103,232,249,0.6)">
        <animate attributeName="width" values="0;45;45" dur="2s" begin="0.6s" fill="freeze" />
        <animate attributeName="opacity" values="0;1;0.8" dur="2s" begin="0.6s" fill="freeze" />
      </rect>

      <rect x="100" y="62" width="0" height="10" rx="2" fill="rgba(255,140,66,0.6)">
        <animate attributeName="width" values="0;30;30" dur="2s" begin="0.9s" fill="freeze" />
        <animate attributeName="opacity" values="0;1;0.8" dur="2s" begin="0.9s" fill="freeze" />
      </rect>

      <rect x="160" y="84" width="0" height="10" rx="2" fill="rgba(167,139,250,0.5)">
        <animate attributeName="width" values="0;65;65" dur="2s" begin="1.3s" fill="freeze" />
        <animate attributeName="opacity" values="0;1;0.7" dur="2s" begin="1.3s" fill="freeze" />
      </rect>

      {/* Connection lines (animated) */}
      <line x1="152" y1="23" x2="82" y2="45" stroke="rgba(167,139,250,0.15)" strokeWidth="0.5" strokeDasharray="2 2">
        <animate attributeName="opacity" values="0;0.6" dur="2s" begin="1s" fill="freeze" />
      </line>
      <line x1="127" y1="45" x2="100" y2="67" stroke="rgba(103,232,249,0.15)" strokeWidth="0.5" strokeDasharray="2 2">
        <animate attributeName="opacity" values="0;0.6" dur="2s" begin="1.2s" fill="freeze" />
      </line>
      <line x1="130" y1="67" x2="160" y2="89" stroke="rgba(255,140,66,0.15)" strokeWidth="0.5" strokeDasharray="2 2">
        <animate attributeName="opacity" values="0;0.6" dur="2s" begin="1.5s" fill="freeze" />
      </line>

      {/* Duration markers */}
      <text x="155" y="26" fontSize="7" fill="rgba(167,139,250,0.4)" fontFamily="monospace">
        <animate attributeName="opacity" values="0;1" dur="0.5s" begin="1.2s" fill="freeze" />
        1.2s
      </text>
      <text x="130" y="48" fontSize="7" fill="rgba(103,232,249,0.4)" fontFamily="monospace">
        <animate attributeName="opacity" values="0;1" dur="0.5s" begin="1.5s" fill="freeze" />
        450ms
      </text>
      <text x="133" y="70" fontSize="7" fill="rgba(255,140,66,0.4)" fontFamily="monospace">
        <animate attributeName="opacity" values="0;1" dur="0.5s" begin="1.8s" fill="freeze" />
        280ms
      </text>
    </svg>
  );
}
