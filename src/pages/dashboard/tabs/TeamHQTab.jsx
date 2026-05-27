import { useState, useEffect } from 'react';

const IFRAME_URL = 'https://stoic-hq-team-view.vercel.app/';

const FEATURES = [
  { icon: '🤖', text: 'Real-time agent status with 3D avatars' },
  { icon: '🏢', text: 'Department-level filtering & navigation' },
  { icon: '📡', text: 'Live activity feed with speech bubbles' },
  { icon: '🎯', text: 'Click any agent to inspect active tasks' },
  { icon: '🧠', text: 'AI-powered task progress tracking' },
];

// Keyframe injection (runs once)
let stylesInjected = false;
function injectKeyframes() {
  if (stylesInjected) return;
  stylesInjected = true;
  const sheet = document.createElement('style');
  sheet.textContent = `
    @keyframes teamhq-border-glow {
      0%   { border-color: rgba(124,58,237,.45); box-shadow: 0 0 30px rgba(124,58,237,.12); }
      50%  { border-color: rgba(59,130,246,.45);  box-shadow: 0 0 30px rgba(59,130,246,.12); }
      100% { border-color: rgba(124,58,237,.45); box-shadow: 0 0 30px rgba(124,58,237,.12); }
    }
    @keyframes teamhq-badge-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50%      { transform: scale(1.08); opacity: .85; }
    }
    @keyframes teamhq-float {
      0%, 100% { transform: translate(-50%, 0); }
      50%      { transform: translate(-50%, -8px); }
    }
    @keyframes teamhq-shimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes teamhq-loader-float {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-6px); }
    }
  `;
  document.head.appendChild(sheet);
}

export default function TeamHQTab({ planName, handleUpgrade, upgradeLoading }) {
  const [time, setTime] = useState(new Date());
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const isPaid = planName !== 'FREE';

  useEffect(() => {
    injectKeyframes();
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const clockStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div style={s.wrapper}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.headerIcon}>🏢</div>
          <div>
            <div style={s.headerTitle}>Team Operations Center</div>
            <div style={s.headerSub}>
              {isPaid ? 'Live 3D view of your AI agent fleet' : 'Preview — Upgrade to unlock full access'}
            </div>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={s.clock}>{clockStr}</div>
          {isPaid && (
            <a
              href={IFRAME_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={s.popOutBtn}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; }}
            >
              Pop Out ↗
            </a>
          )}
          {!isPaid && (
            <div style={s.proBadge}>PRO</div>
          )}
        </div>
      </div>

      {/* Main container */}
      <div style={s.container}>
        {/* Iframe */}
        <div style={{
          ...s.iframeWrap,
          ...(isPaid ? {} : { pointerEvents: 'none' }),
          animation: isPaid ? undefined : 'teamhq-border-glow 4s ease-in-out infinite',
        }}>
          {!iframeLoaded && (
            <div style={s.loader}>
              <div style={s.loaderIcon}>🏢</div>
              <div style={s.loaderText}>Initializing Operations Center...</div>
              <div style={s.loaderBar}>
                <div style={s.loaderFill} />
              </div>
            </div>
          )}
          <iframe
            src={IFRAME_URL}
            title="Team Operations Center"
            style={{
              ...s.iframe,
              opacity: iframeLoaded ? 1 : 0,
            }}
            onLoad={() => setIframeLoaded(true)}
            allow="accelerometer; autoplay"
          />
        </div>

        {/* FREE overlay */}
        {!isPaid && (
          <>
            {/* Gradient blur overlay on bottom */}
            <div style={s.blurOverlay} />

            {/* Upgrade card */}
            <div style={s.upgradeCard}>
              <div style={s.upgradeGlow} />

              <div style={s.upgradeInner}>
                <div style={s.upgradeBadge}>✨ PREMIUM FEATURE</div>
                <h2 style={s.upgradeTitle}>🏢 Team Operations Center</h2>
                <p style={s.upgradeSub}>
                  Visualize your entire AI agent fleet in a stunning 3D operations room.
                  Monitor, filter, and inspect every agent in real-time.
                </p>

                <div style={s.featureList}>
                  {FEATURES.map((f, i) => (
                    <div key={i} style={s.featureItem}>
                      <span style={s.featureIcon}>{f.icon}</span>
                      <span style={s.featureText}>{f.text}</span>
                    </div>
                  ))}
                </div>

                <div style={s.ctaRow}>
                  <button
                    style={s.ctaPro}
                    onClick={() => handleUpgrade('pro')}
                    disabled={upgradeLoading}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,.25)'; }}
                  >
                    {upgradeLoading ? '⏳ Processing...' : '⚡ Upgrade to Pro — $29/mo'}
                  </button>
                  <button
                    style={s.ctaTeam}
                    onClick={() => handleUpgrade('team')}
                    disabled={upgradeLoading}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    🚀 Team Plan — $79/mo
                  </button>
                </div>

                <div style={s.upgradeFooter}>
                  Cancel anytime · 14-day money-back guarantee
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const s = {
  wrapper: {
    background: '#09090b',
    minHeight: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    color: '#fafafa',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    borderBottom: '1px solid rgba(255,255,255,.06)',
    background: '#0a0a0c',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: -0.3,
    color: '#fafafa',
  },
  headerSub: {
    fontSize: 11,
    color: 'rgba(161,161,170,.7)',
    letterSpacing: .5,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  clock: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 12,
    color: 'rgba(161,161,170,.8)',
    background: 'rgba(255,255,255,.04)',
    padding: '5px 10px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,.06)',
  },
  popOutBtn: {
    fontSize: 12,
    fontWeight: 600,
    color: '#a78bfa',
    background: 'rgba(255,255,255,.06)',
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid rgba(124,58,237,.25)',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all .15s ease',
  },
  proBadge: {
    padding: '5px 14px',
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 2,
    background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    color: '#fff',
    animation: 'teamhq-badge-pulse 2s ease-in-out infinite',
  },
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  iframeWrap: {
    position: 'absolute',
    inset: 0,
    border: '2px solid rgba(124,58,237,.2)',
    borderTop: 'none',
    borderRadius: '0 0 12px 12px',
    overflow: 'hidden',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
    transition: 'opacity .6s ease',
  },
  loader: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#09090b',
    zIndex: 5,
  },
  loaderIcon: {
    fontSize: 48,
    marginBottom: 16,
    animation: 'teamhq-loader-float 2s ease-in-out infinite',
  },
  loaderText: {
    fontSize: 13,
    color: 'rgba(161,161,170,.8)',
    letterSpacing: 1,
    marginBottom: 20,
  },
  loaderBar: {
    width: 200,
    height: 3,
    background: 'rgba(255,255,255,.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  loaderFill: {
    width: '60%',
    height: '100%',
    borderRadius: 3,
    background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #3b82f6)',
    backgroundSize: '200% 100%',
    animation: 'teamhq-shimmer 1.5s linear infinite',
  },

  // ── Free user overlay ──
  blurOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    background: 'linear-gradient(to bottom, transparent 0%, rgba(9,9,11,.6) 30%, rgba(9,9,11,.92) 70%, rgba(9,9,11,.98) 100%)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    zIndex: 10,
    pointerEvents: 'none',
  },
  upgradeCard: {
    position: 'absolute',
    bottom: 32,
    left: '50%',
    zIndex: 20,
    width: '100%',
    maxWidth: 520,
    animation: 'teamhq-float 4s ease-in-out infinite',
  },
  upgradeGlow: {
    position: 'absolute',
    inset: -2,
    borderRadius: 22,
    background: 'linear-gradient(135deg, rgba(124,58,237,.3), rgba(59,130,246,.3), rgba(124,58,237,.3))',
    backgroundSize: '200% 200%',
    animation: 'teamhq-shimmer 3s linear infinite',
    filter: 'blur(8px)',
    zIndex: -1,
  },
  upgradeInner: {
    background: 'rgba(9,9,11,.92)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(124,58,237,.3)',
    borderRadius: 20,
    padding: '28px 32px 24px',
    textAlign: 'center',
  },
  upgradeBadge: {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.5,
    background: 'linear-gradient(135deg, rgba(124,58,237,.2), rgba(59,130,246,.2))',
    color: '#a78bfa',
    border: '1px solid rgba(124,58,237,.25)',
    marginBottom: 16,
  },
  upgradeTitle: {
    fontSize: 22,
    fontWeight: 800,
    margin: '0 0 8px',
    background: 'linear-gradient(135deg, #e0e0e0, #ffffff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: -0.5,
  },
  upgradeSub: {
    fontSize: 13,
    color: 'rgba(161,161,170,.85)',
    lineHeight: 1.6,
    margin: '0 0 20px',
    maxWidth: 420,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 24,
    textAlign: 'left',
    padding: '0 16px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 12.5,
  },
  featureIcon: {
    fontSize: 15,
    width: 24,
    textAlign: 'center',
    flexShrink: 0,
  },
  featureText: {
    color: 'rgba(228,228,231,.9)',
    fontWeight: 500,
  },
  ctaRow: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  ctaPro: {
    padding: '12px 28px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    transition: 'all .2s ease',
    boxShadow: '0 4px 20px rgba(124,58,237,.25)',
    letterSpacing: -0.2,
  },
  ctaTeam: {
    padding: '12px 28px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    background: 'rgba(255,255,255,.06)',
    color: '#e4e4e7',
    border: '1px solid rgba(255,255,255,.1)',
    cursor: 'pointer',
    transition: 'all .2s ease',
    letterSpacing: -0.2,
  },
  upgradeFooter: {
    fontSize: 11,
    color: 'rgba(113,113,122,.6)',
    fontWeight: 400,
  },
};
