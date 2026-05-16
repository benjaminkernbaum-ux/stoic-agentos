import { useState, useEffect, useRef, useCallback } from 'react';
import './OnboardingTour.css';

const STORAGE_KEY = 'agentos_onboarding_v1';

const SPOTLIGHT_STEPS = [
  {
    id: 'stats',
    targetId: 'ob-stats',
    tab: 'overview',
    title: 'Your Fleet Command Center',
    body: 'Every agent, observation, and workspace your AI fleet touches shows up here in real time.',
    padding: 12,
  },
  {
    id: 'apikey',
    targetId: 'ob-nav-settings',
    tab: 'settings',
    title: 'Your API Key Lives Here',
    body: 'Go to Settings to copy your API key — every agent uses it to authenticate with AgentOS.',
    padding: 6,
    cta: 'Go to Settings →',
    ctaTab: 'settings',
  },
  {
    id: 'capture',
    targetId: 'ob-capture',
    tab: 'overview',
    title: 'Capture Your First Observation',
    body: 'Type anything that just happened in your project and hit Capture. This is how your fleet logs every decision.',
    padding: 10,
    waitForCapture: true,
  },
];

// ── Safe localStorage helper ──────────────────────────────────
function lsGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, val); } catch {}
}

// ── Progress Dots ─────────────────────────────────────────────
function ProgressDots({ total, current }) {
  return (
    <div className="ob-progress">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`ob-progress-dot ${i === current ? 'active' : i < current ? 'done' : ''}`}
        />
      ))}
      <span className="ob-step-counter">{current + 1}/{total}</span>
    </div>
  );
}

// ── Welcome Modal ─────────────────────────────────────────────
function WelcomeModal({ userName, onStart, onSkip }) {
  return (
    <div className="ob-welcome-backdrop" role="dialog" aria-modal="true" aria-label="Welcome to AgentOS">
      <div className="ob-welcome-card">
        <div className="ob-welcome-glow" />
        <div className="ob-welcome-icon">⚡</div>
        <h1>
          Welcome,{' '}
          <span className="ob-welcome-name">{userName.split(' ')[0]}</span>
        </h1>
        <p style={{ marginBottom: 28, marginTop: 8 }}>
          Your AI agent operations platform is ready. Let's take 90 seconds to set up your fleet.
        </p>
        <ul className="ob-welcome-features">
          <li>
            <div className="ob-welcome-feature-icon purple">📊</div>
            <div className="ob-welcome-feature-text">
              <strong>Live Fleet Overview</strong>
              <span>Monitor every agent in one real-time dashboard</span>
            </div>
          </li>
          <li>
            <div className="ob-welcome-feature-icon cyan">🔑</div>
            <div className="ob-welcome-feature-text">
              <strong>API Key Ready</strong>
              <span>Connect any AI agent in seconds with the SDK</span>
            </div>
          </li>
          <li>
            <div className="ob-welcome-feature-icon green">🧠</div>
            <div className="ob-welcome-feature-text">
              <strong>Persistent Memory</strong>
              <span>Every decision and observation is saved forever</span>
            </div>
          </li>
        </ul>
        <div className="ob-welcome-actions">
          <button className="ob-btn-primary" onClick={onStart} autoFocus>
            Start quick tour →
          </button>
          <button className="ob-welcome-skip" onClick={onSkip}>
            Skip — I'll explore on my own
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SDK Step Modal ─────────────────────────────────────────────
function SdkModal({ apiKey, onNext, onSkip, stepIndex, total }) {
  const [copied, setCopied] = useState({});

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(p => ({ ...p, [key]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000);
  };

  const displayKey = apiKey || 'sk_live_YOUR_KEY_HERE';
  const installCmd = 'npm install stoic-agentos-sdk';
  const initCmd = `npx stoic-agentos-sdk init ${displayKey}`;

  return (
    <div className="ob-sdk-backdrop" role="dialog" aria-modal="true">
      <div className="ob-sdk-card">
        <div className="ob-sdk-header">
          <ProgressDots total={total} current={stepIndex} />
          <h2>Install the SDK</h2>
          <p>One command connects any AI agent to AgentOS — works with Claude, GPT, LangChain, anything.</p>
        </div>
        <div className="ob-sdk-commands">
          {[
            { label: '1 · Install', cmd: installCmd, key: 'install' },
            { label: '2 · Initialize', cmd: initCmd, key: 'init' },
          ].map(({ label, cmd, key }) => (
            <div key={key} className="ob-cmd-block">
              <div className="ob-cmd-header">
                <span className="ob-cmd-label">{label}</span>
                <button className={`ob-cmd-copy ${copied[key] ? 'copied' : ''}`} onClick={() => copy(cmd, key)}>
                  {copied[key] ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="ob-cmd-body">{cmd}</div>
            </div>
          ))}
          <div className="ob-cmd-block">
            <div className="ob-cmd-header">
              <span className="ob-cmd-label">3 · Use in your agent</span>
              <button className={`ob-cmd-copy ${copied.sdk ? 'copied' : ''}`} onClick={() => copy(
                `import AgentOS from 'stoic-agentos-sdk';\nconst agentos = new AgentOS({ apiKey: '${displayKey}' });\nconst myAgent = agentos.wrapAgent('my-agent', async (ctx) => {\n  ctx.observe({ type: 'decision', title: 'Started processing' });\n  // ... your agent logic\n});\nawait myAgent();`,
                'sdk'
              )}>
                {copied.sdk ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div className="ob-cmd-body" style={{ whiteSpace: 'pre', overflowX: 'auto', fontSize: 12 }}>
              <span className="kw">import</span> AgentOS <span className="kw">from</span> <span className="str">'stoic-agentos-sdk'</span>;{'\n'}
              <span className="kw">const</span> agentos = <span className="kw">new</span> AgentOS({'{ '}apiKey: <span className="str">'{displayKey}'</span>{' }'});{'\n\n'}
              <span className="cm">// Wrap your AI agent function</span>{'\n'}
              <span className="kw">const</span> myAgent = agentos.<span className="fn">wrapAgent</span>(<span className="str">'my-agent'</span>, <span className="kw">async</span> (ctx) ={'>'} {'{'}{'\n'}
              {'  '}ctx.<span className="fn">observe</span>({'{ '}type: <span className="str">'decision'</span>, title: <span className="str">'Started'</span>{' }'});{'\n'}
              {'  '}<span className="cm">// ... your agent logic</span>{'\n'}
              {'}'});{'\n\n'}
              <span className="kw">await</span> <span className="fn">myAgent</span>();
            </div>
          </div>
        </div>
        <div className="ob-sdk-footer">
          <button className="ob-btn-ghost" onClick={onSkip}>Skip tour</button>
          <button className="ob-btn-primary" onClick={onNext}>Done — go to dashboard →</button>
        </div>
      </div>
    </div>
  );
}

// ── Particle confetti ──────────────────────────────────────────
const PARTICLES = [
  { left: '12%', delay: '0s', bg: '#9b59ff', size: 8 },
  { left: '28%', delay: '0.25s', bg: '#00e68a', size: 6 },
  { left: '50%', delay: '0.1s', bg: '#4d7cff', size: 10 },
  { left: '62%', delay: '0.45s', bg: '#ff9f43', size: 7 },
  { left: '78%', delay: '0.15s', bg: '#00d4ff', size: 9 },
  { left: '18%', delay: '0.7s', bg: '#ff6b9d', size: 5 },
  { left: '72%', delay: '0.6s', bg: '#9b59ff', size: 6 },
  { left: '42%', delay: '0.35s', bg: '#00e68a', size: 8 },
  { left: '88%', delay: '0.55s', bg: '#ff9f43', size: 5 },
];

// ── Done Modal ─────────────────────────────────────────────────
function DoneModal({ onClose, observationCount, planName }) {
  return (
    <div className="ob-done-backdrop" role="dialog" aria-modal="true">
      <div className="ob-done-card">
        <div className="ob-done-particles">
          {PARTICLES.map((p, i) => (
            <div key={i} className="ob-particle" style={{
              left: p.left, bottom: 0,
              background: p.bg,
              width: p.size, height: p.size,
              animationDelay: p.delay,
              animationDuration: `${2.5 + i * 0.25}s`,
            }} />
          ))}
        </div>
        <div className="ob-done-checkmark">🎉</div>
        <h2>You're Live!</h2>
        <p>
          AgentOS is ready. Install the SDK in any project and your agents will start reporting here in real time.
        </p>
        <div className="ob-done-stats">
          <div className="ob-done-stat">
            <div className="ob-done-stat-value" style={{ color: 'var(--accent-green)' }}>
              {observationCount || 1}
            </div>
            <div className="ob-done-stat-label">Observations</div>
          </div>
          <div className="ob-done-stat">
            <div className="ob-done-stat-value" style={{ color: 'var(--accent-purple)' }}>
              {(planName || 'Free').toUpperCase()}
            </div>
            <div className="ob-done-stat-label">Current plan</div>
          </div>
          <div className="ob-done-stat">
            <div className="ob-done-stat-value" style={{ color: 'var(--accent-cyan)' }}>
              10K
            </div>
            <div className="ob-done-stat-label">Obs/month</div>
          </div>
        </div>
        <div className="ob-done-actions">
          <button className="ob-btn-primary" onClick={onClose} autoFocus>
            Open my dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Spotlight Tooltip ──────────────────────────────────────────
function SpotlightTooltip({ stepDef, stepIndex, totalSteps, onNext, onSkip, setActiveTab, rect }) {
  const tooltipRef = useRef(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });

  useEffect(() => {
    if (!rect || !tooltipRef.current) return;
    const tRect = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 14;
    const edge = 12;

    let top, left;
    const belowTop = rect.bottom + gap;
    const aboveTop = rect.top - tRect.height - gap;
    const rightLeft = rect.right + gap;
    const leftLeft = rect.left - tRect.width - gap;

    if (belowTop + tRect.height < vh - edge) {
      top = belowTop;
      left = rect.left + rect.width / 2 - tRect.width / 2;
    } else if (aboveTop > edge) {
      top = aboveTop;
      left = rect.left + rect.width / 2 - tRect.width / 2;
    } else if (rightLeft + tRect.width < vw - edge) {
      top = rect.top + rect.height / 2 - tRect.height / 2;
      left = rightLeft;
    } else {
      top = rect.top + rect.height / 2 - tRect.height / 2;
      left = leftLeft;
    }

    left = Math.max(edge, Math.min(left, vw - tRect.width - edge));
    top  = Math.max(edge, Math.min(top,  vh - tRect.height - edge));
    setPos({ top, left });
  }, [rect]);

  const handleCta = () => {
    if (stepDef.ctaTab) setActiveTab(stepDef.ctaTab);
    onNext();
  };

  return (
    <div
      ref={tooltipRef}
      className="ob-tooltip"
      style={{ top: pos.top, left: pos.left }}
      role="dialog"
    >
      <ProgressDots total={totalSteps} current={stepIndex} />
      <div className="ob-tooltip-step">
        <div className="ob-tooltip-step-dot" />
        Step {stepIndex + 1} of {totalSteps}
      </div>
      <h3>{stepDef.title}</h3>
      <p>{stepDef.body}</p>
      <div className="ob-tooltip-actions">
        <button className="ob-btn-ghost" onClick={onSkip}>Skip</button>
        {stepDef.waitForCapture ? (
          <button className="ob-btn-primary ob-btn-waiting" disabled>
            Waiting for capture ↑
          </button>
        ) : stepDef.cta ? (
          <button className="ob-btn-primary" onClick={handleCta}>{stepDef.cta}</button>
        ) : (
          <button className="ob-btn-primary" onClick={onNext}>Next →</button>
        )}
      </div>
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────
export default function OnboardingTour({
  isNewUser,
  agents,
  observations,
  apiKey,
  userName,
  setActiveTab,
  onCaptureRef,
  planName,
}) {
  const [phase, setPhase] = useState('hidden');
  const [spotlightIdx, setSpotlightIdx] = useState(0);
  const [rect, setRect] = useState(null);

  const TOTAL_TOUR_STEPS = SPOTLIGHT_STEPS.length + 1; // spotlight steps + sdk step

  // Decide whether to show
  useEffect(() => {
    const saved = lsGet(STORAGE_KEY);
    if (saved === 'done' || saved === 'skip') return;
    if (isNewUser) {
      const t = setTimeout(() => setPhase('welcome'), 900);
      return () => clearTimeout(t);
    }
  }, [isNewUser]);

  // Keyboard: Esc = skip, Enter = next
  useEffect(() => {
    if (phase === 'hidden') return;
    const handler = (e) => {
      if (e.key === 'Escape') skip();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase]);

  const currentDef = phase === 'spotlight' ? SPOTLIGHT_STEPS[spotlightIdx] : null;

  // Navigate tab when step changes
  useEffect(() => {
    if (currentDef?.tab) setActiveTab(currentDef.tab);
  }, [spotlightIdx, currentDef?.tab, setActiveTab]);

  // Measure spotlight target
  const measureTarget = useCallback(() => {
    if (!currentDef) return;
    const el = document.getElementById(currentDef.targetId);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = currentDef.padding || 8;
    setRect({ top: r.top - p, left: r.left - p, width: r.width + p * 2, height: r.height + p * 2 });
  }, [currentDef]);

  useEffect(() => {
    if (!currentDef) { setRect(null); return; }
    const t = setTimeout(measureTarget, 220);
    return () => clearTimeout(t);
  }, [currentDef, measureTarget]);

  useEffect(() => {
    if (!currentDef) return;
    window.addEventListener('resize', measureTarget);
    return () => window.removeEventListener('resize', measureTarget);
  }, [currentDef, measureTarget]);

  // Wire capture auto-advance
  useEffect(() => {
    if (!onCaptureRef) return;
    const capIdx = SPOTLIGHT_STEPS.findIndex(s => s.waitForCapture);
    onCaptureRef.current = () => {
      if (phase === 'spotlight' && spotlightIdx === capIdx) {
        advanceSpotlight();
      }
    };
  }); // intentionally no deps — always stays current

  const skip = () => { lsSet(STORAGE_KEY, 'skip'); setPhase('hidden'); };
  const complete = () => { lsSet(STORAGE_KEY, 'done'); setPhase('hidden'); };

  const startTour = () => { setSpotlightIdx(0); setPhase('spotlight'); };

  const advanceSpotlight = () => {
    if (spotlightIdx < SPOTLIGHT_STEPS.length - 1) {
      setSpotlightIdx(i => i + 1);
    } else {
      setPhase('sdk');
    }
  };

  if (phase === 'hidden') return null;

  if (phase === 'welcome') {
    return <WelcomeModal userName={userName} onStart={startTour} onSkip={skip} />;
  }

  if (phase === 'sdk') {
    return (
      <SdkModal
        apiKey={apiKey}
        onNext={() => { setPhase('done'); setActiveTab('overview'); }}
        onSkip={skip}
        stepIndex={SPOTLIGHT_STEPS.length}
        total={TOTAL_TOUR_STEPS}
      />
    );
  }

  if (phase === 'done') {
    return <DoneModal onClose={complete} observationCount={observations.length} planName={planName} />;
  }

  // Spotlight phase
  if (phase === 'spotlight' && currentDef) {
    return (
      <>
        <div className="ob-overlay" onClick={(e) => e.stopPropagation()} />
        {rect && (
          <div
            className="ob-spotlight"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          />
        )}
        {rect && (
          <SpotlightTooltip
            stepDef={currentDef}
            stepIndex={spotlightIdx}
            totalSteps={TOTAL_TOUR_STEPS}
            onNext={advanceSpotlight}
            onSkip={skip}
            setActiveTab={setActiveTab}
            rect={rect}
          />
        )}
      </>
    );
  }

  return null;
}
