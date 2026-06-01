import { useRef, useEffect } from 'react';

/* ─── DATA ─── */
const ACQUISITIONS = [
  { icon: '🔍', company: 'Langfuse', acquirer: 'ClickHouse', date: 'Jan 2026' },
  { icon: '📝', company: 'Helicone', acquirer: 'Mintlify', date: 'Mar 2026' },
  { icon: '⚖️', company: 'W&B Weave', acquirer: 'CoreWeave', date: 'May 2025' },
  { icon: '🏢', company: 'Galileo', acquirer: 'Cisco/Splunk', date: 'May 2026' },
];

/* ─── SCROLL REVEAL HOOK (matches LandingPage pattern) ─── */
function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.querySelectorAll('.section-reveal').forEach((child, i) => {
              setTimeout(() => child.classList.add('visible'), i * 100);
            });
            if (e.target.classList.contains('section-reveal')) {
              e.target.classList.add('visible');
            }
          }
        });
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ─── STYLES ─── */
const styles = {
  section: {
    padding: '80px 0',
    background: 'var(--bg-deep, #0a0a12)',
    position: 'relative',
    overflow: 'hidden',
  },
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '0 24px',
    textAlign: 'center',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 16,
  },
  headline: {
    fontSize: 'clamp(1.4rem, 3vw, 2rem)',
    fontWeight: 800,
    color: '#fff',
    lineHeight: 1.35,
    margin: '0 auto 48px',
    maxWidth: 700,
  },
  headlineAccent: {
    color: 'var(--accent-green, #00e68a)',
  },

  /* ─ Acquisition Cards Grid ─ */
  acquisitionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 24,
  },
  acquisitionCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: '20px 16px',
    textAlign: 'center',
    transition: 'transform 0.3s, border-color 0.3s',
  },
  acqIcon: {
    fontSize: '1.6rem',
    marginBottom: 10,
    opacity: 0.6,
  },
  acqCompany: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.35)',
    textDecoration: 'line-through',
    textDecorationColor: 'rgba(255,255,255,0.2)',
    marginBottom: 6,
  },
  acqArrow: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.15)',
    marginBottom: 6,
  },
  acqAcquirer: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 8,
  },
  acqDate: {
    fontSize: '0.65rem',
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.2)',
    fontFamily: "'JetBrains Mono', monospace",
  },

  /* ─ Stoic Card ─ */
  stoicCard: {
    background: 'rgba(155,89,255,0.08)',
    border: '1px solid rgba(155,89,255,0.3)',
    borderRadius: 14,
    padding: '24px 32px',
    boxShadow: '0 0 30px rgba(155,89,255,0.15)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 14,
    transition: 'box-shadow 0.4s, transform 0.3s',
    cursor: 'default',
  },
  stoicDotWrap: {
    position: 'relative',
    width: 12,
    height: 12,
    flexShrink: 0,
  },
  stoicDotCore: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: 'var(--accent-green, #00e68a)',
    boxShadow: '0 0 8px rgba(0,230,138,0.6)',
  },
  stoicDotPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: 'var(--accent-green, #00e68a)',
    animation: 'mcPulse 2s ease-out infinite',
  },
  stoicText: {
    fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: 0.3,
  },
  stoicTextMuted: {
    fontWeight: 400,
    color: 'rgba(255,255,255,0.7)',
  },
};

/* ─── KEYFRAMES (injected once) ─── */
const KEYFRAMES_ID = 'mc-keyframes';
function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes mcPulse {
      0%   { opacity: 0.7; transform: scale(1); }
      70%  { opacity: 0; transform: scale(2.8); }
      100% { opacity: 0; transform: scale(2.8); }
    }
  `;
  document.head.appendChild(style);
}

/* ─── RESPONSIVE STYLE (injected once) ─── */
const RESPONSIVE_ID = 'mc-responsive';
function injectResponsive() {
  if (document.getElementById(RESPONSIVE_ID)) return;
  const style = document.createElement('style');
  style.id = RESPONSIVE_ID;
  style.textContent = `
    @media (max-width: 900px) {
      .mc-acquisitions-grid {
        grid-template-columns: repeat(2, 1fr) !important;
      }
    }
    @media (max-width: 520px) {
      .mc-acquisitions-grid {
        grid-template-columns: 1fr !important;
      }
      .mc-stoic-card {
        flex-direction: column !important;
        text-align: center !important;
      }
    }
    /* Acquisition card hover */
    .mc-acq-card:hover {
      transform: translateY(-3px);
      border-color: rgba(255,255,255,0.12) !important;
    }
    /* Stoic card hover */
    .mc-stoic-card:hover {
      box-shadow: 0 0 50px rgba(155,89,255,0.25) !important;
      transform: translateY(-2px);
    }
  `;
  document.head.appendChild(style);
}

/* ═══════════════════════════════════════════
   MARKET CONSOLIDATION COMPONENT
   ═══════════════════════════════════════════ */
export default function MarketConsolidation() {
  const sectionRef = useScrollReveal();

  useEffect(() => {
    injectKeyframes();
    injectResponsive();
  }, []);

  return (
    <section style={styles.section} ref={sectionRef}>
      <div style={styles.container}>
        {/* Label */}
        <div className="section-reveal" style={styles.label}>
          🏴 MARKET CONSOLIDATION
        </div>

        {/* Headline */}
        <h2 className="section-reveal" style={styles.headline}>
          4 competitors acquired in 12 months.{' '}
          <span style={styles.headlineAccent}>
            We're staying independent and open-source.
          </span>
        </h2>

        {/* Acquisition Cards */}
        <div
          className="mc-acquisitions-grid section-reveal"
          style={{ ...styles.acquisitionsGrid, transitionDelay: '0.2s' }}
        >
          {ACQUISITIONS.map((a, i) => (
            <div
              key={a.company}
              className="mc-acq-card"
              style={{
                ...styles.acquisitionCard,
                transitionDelay: `${0.1 * i}s`,
              }}
            >
              <div style={styles.acqIcon}>{a.icon}</div>
              <div style={styles.acqCompany}>{a.company}</div>
              <div style={styles.acqArrow}>→</div>
              <div style={styles.acqAcquirer}>{a.acquirer}</div>
              <div style={styles.acqDate}>{a.date}</div>
            </div>
          ))}
        </div>

        {/* Stoic AgentOS Card */}
        <div
          className="section-reveal"
          style={{ transitionDelay: '0.4s', marginTop: 8 }}
        >
          <div className="mc-stoic-card" style={styles.stoicCard}>
            <div style={styles.stoicDotWrap}>
              <div style={styles.stoicDotPulse} />
              <div style={styles.stoicDotCore} />
            </div>
            <span style={styles.stoicText}>
              ⚡ Stoic AgentOS —{' '}
              <span style={styles.stoicTextMuted}>
                Independent. Open-Source. Builder-Owned.
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
