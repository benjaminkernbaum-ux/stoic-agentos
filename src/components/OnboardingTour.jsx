import { useState, useEffect, useRef, useCallback } from 'react';
import './OnboardingTour.css';

const STORAGE_KEY = 'agentos_onboarding_v1';

// Tour steps (spotlight steps reference element IDs added to Dashboard)
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
    body: 'Head to Settings to copy your API key. Every agent authenticates with it.',
    padding: 6,
    cta: 'Go to Settings',
    ctaTab: 'settings',
  },
  {
    id: 'capture',
    targetId: 'ob-capture',
    tab: 'overview',
    title: 'Try It — Capture Right Now',
    body: 'Type what just happened in your project and hit Capture. This is how your agents log everything.',
    padding: 10,
    waitForCapture: true,
  },
];

function ProgressDots({ total, current }) {
  return (
    <div className="ob-progress">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`ob-progress-dot ${i === current ? 'active' : i < current ? 'done' : ''}`}
          style={i !== current && i >= current ? { width: 8 } : undefined}
        />
      ))}
      <span className="ob-step-counter">{current + 1}/{total}</span>
    </div>
  );
}

function WelcomeModal({ userName, onStart, onSkip }) {
  return (
    <div className="ob-welcome-backdrop">
      <div className="ob-welcome-card">
        <div className="ob-welcome-glow" />
        <div className="ob-welcome-icon">⚡</div>
        <h1>
          Welcome,{' '}
          <span className="ob-welcome-name">{userName}</span>
        </h1>
        <p style={{ marginBottom: 28, marginTop: 8 }}>
          Your AI agent operations platform is ready. Let's take 2 minutes to set up your fleet.
        </p>
        <ul className="ob-welcome-features">
          <li>
            <div className="ob-welcome-feature-icon purple">📊</div>
            <div className="ob-welcome-feature-text">
              <strong>Live Fleet Overview</strong>
              <span>Monitor every agent in one place</span>
            </div>
          </li>
          <li>
            <div className="ob-welcome-feature-icon cyan">🔑</div>
            <div className="ob-welcome-feature-text">
              <strong>API Key Ready</strong>
              <span>Connect any AI agent in seconds</span>
            </div>
          </li>
          <li>
            <div className="ob-welcome-feature-icon green">🧠</div>
            <div className="ob-welcome-feature-text">
              <strong>Persistent Memory</strong>
              <span>Every decision and observation is saved</span>
            </div>
          </li>
        </ul>
        <div className="ob-welcome-actions">
          <button className="ob-btn-primary" onClick={onStart}>
            Start the tour →
          </button>
          <button className="ob-welcome-skip" onClick={onSkip}>
            Skip — I'll explore on my own
          </button>
        </div>
      </div>
    </div>
  );
}

function SdkModal({ apiKey, onNext, onSkip, step, total }) {
  const [copied, setCopied] = useState({});

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(p => ({ ...p, [key]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000);
  };

  const installCmd = 'npm install stoic-agentos-sdk';
  const initCmd = apiKey ? `npx stoic-agentos-sdk init ${apiKey}` : 'npx stoic-agentos-sdk init YOUR_API_KEY';
  const sdkCode = `import AgentOS from 'stoic-agentos-sdk';

const agentos = new AgentOS({ apiKey: '${apiKey || 'sk_live_...'}' });

// Wrap your AI agent function
const myAgent = agentos.wrapAgent('my-agent', async (ctx) => {
  ctx.observe({ type: 'decision', title: 'Started processing' });
  // ... your agent logic here
});

await myAgent();`;

  return (
    <div className="ob-sdk-backdrop">
      <div className="ob-sdk-card">
        <div className="ob-sdk-header">
          <ProgressDots total={total} current={step} />
          <h2>Install the SDK</h2>
          <p>One command to connect any AI agent to AgentOS.</p>
        </div>
        <div className="ob-sdk-commands">
          <div className="ob-cmd-block">
            <div className="ob-cmd-header">
              <span className="ob-cmd-label">1 · Install</span>
              <button className={`ob-cmd-copy ${copied.install ? 'copied' : ''}`} onClick={() => copy(installCmd, 'install')}>
                {copied.install ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div className="ob-cmd-body">{installCmd}</div>
          </div>
          <div className="ob-cmd-block">
            <div className="ob-cmd-header">
              <span className="ob-cmd-label">2 · Initialize</span>
              <button className={`ob-cmd-copy ${copied.init ? 'copied' : ''}`} onClick={() => copy(initCmd, 'init')}>
                {copied.init ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div className="ob-cmd-body">{initCmd}</div>
          </div>
          <div className="ob-cmd-block">
            <div className="ob-cmd-header">
              <span className="ob-cmd-label">3 · Use in code</span>
              <button className={`ob-cmd-copy ${copied.sdk ? 'copied' : ''}`} onClick={() => copy(sdkCode, 'sdk')}>
                {copied.sdk ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div className="ob-cmd-body" style={{ whiteSpace: 'pre', overflowX: 'auto' }}>
              <span className="kw">import</span> AgentOS <span className="kw">from</span> <span className="str">'stoic-agentos-sdk'</span>;{'\n\n'}
              <span className="kw">const</span> agentos = <span className="kw">new</span> AgentOS({'{ '}apiKey: <span className="str">'{apiKey || 'sk_live_...'}'</span>{' }'}){'\n\n'}
              <span className="cm">// Wrap your AI agent function</span>{'\n'}
              <span className="kw">const</span> myAgent = agentos.wrapAgent(<span className="str">'my-agent'</span>, <span className="kw">async</span> (ctx) ={'>'} {'{'}{'\n'}
              {'  '}ctx.observe({'{ '}type: <span className="str">'decision'</span>, title: <span className="str">'Started'</span>{' }'}){'\n'}
              {'  '}<span className="cm">// ... your agent logic</span>{'\n'}
              {'}'})
            </div>
          </div>
        </div>
        <div className="ob-sdk-footer">
          <button className="ob-btn-ghost" onClick={onSkip}>Skip tour</button>
          <button className="ob-btn-primary" onClick={onNext}>Got it, next →</button>
        </div>
      </div>
    </div>
  );
}

const PARTICLES = [
  { left: '15%', delay: '0s', bg: '#9b59ff', size: 8 },
  { left: '30%', delay: '0.3s', bg: '#00e68a', size: 6 },
  { left: '50%', delay: '0.1s', bg: '#4d7cff', size: 10 },
  { left: '65%', delay: '0.5s', bg: '#ff9f43', size: 7 },
  { left: '80%', delay: '0.2s', bg: '#00d4ff', size: 9 },
  { left: '20%', delay: '0.8s', bg: '#ff6b9d', size: 5 },
  { left: '70%', delay: '0.7s', bg: '#9b59ff', size: 6 },
  { left: '45%', delay: '0.4s', bg: '#00e68a', size: 8 },
];

function DoneModal({ onClose, observationCount }) {
  return (
    <div className="ob-done-backdrop">
      <div className="ob-done-card">
        <div className="ob-done-particles">
          {PARTICLES.map((p, i) => (
            <div
              key={i}
              className="ob-particle"
              style={{
                left: p.left, bottom: 0,
                background: p.bg,
                width: p.size, height: p.size,
                animationDelay: p.delay,
                animationDuration: `${2.5 + i * 0.3}s`,
              }}
            />
          ))}
        </div>
        <div className="ob-done-checkmark">🎉</div>
        <h2>You're Live!</h2>
        <p>
          AgentOS is ready to monitor your fleet. Install the SDK in any project and your agents
          will start reporting in real time.
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
              Free
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
          <button className="ob-btn-primary" onClick={onClose}>
            Open my dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}

function SpotlightTooltip({ stepDef, stepIndex, totalSteps, onNext, onSkip, setActiveTab, rect }) {
  const tooltipRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Position tooltip relative to spotlight rect
  useEffect(() => {
    if (!rect || !tooltipRef.current) return;
    const tRect = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 16;
    const padding = stepDef.padding || 8;

    let top, left;

    // Try below
    const belowTop = rect.bottom + padding + margin;
    // Try above
    const aboveTop = rect.top - tRect.height - padding - margin;
    // Try right
    const rightLeft = rect.right + padding + margin;
    // Try left
    const leftLeft = rect.left - tRect.width - padding - margin;

    if (belowTop + tRect.height < vh - margin) {
      top = belowTop;
      left = rect.left + rect.width / 2 - tRect.width / 2;
    } else if (aboveTop > margin) {
      top = aboveTop;
      left = rect.left + rect.width / 2 - tRect.width / 2;
    } else if (rightLeft + tRect.width < vw - margin) {
      top = rect.top + rect.height / 2 - tRect.height / 2;
      left = rightLeft;
    } else {
      top = rect.top + rect.height / 2 - tRect.height / 2;
      left = leftLeft;
    }

    // Clamp to viewport
    left = Math.max(margin, Math.min(left, vw - tRect.width - margin));
    top  = Math.max(margin, Math.min(top, vh - tRect.height - margin));

    setPos({ top, left });
  }, [rect, stepDef]);

  const handleCta = () => {
    if (stepDef.ctaTab) setActiveTab(stepDef.ctaTab);
    onNext();
  };

  return (
    <div
      ref={tooltipRef}
      className="ob-tooltip"
      style={{ top: pos.top, left: pos.left }}
    >
      <ProgressDots total={totalSteps} current={stepIndex} />
      <div className="ob-tooltip-step">
        <div className="ob-tooltip-step-dot" />
        Step {stepIndex + 1}
      </div>
      <h3>{stepDef.title}</h3>
      <p>{stepDef.body}</p>
      <div className="ob-tooltip-actions">
        <button className="ob-btn-ghost" onClick={onSkip}>Skip</button>
        {stepDef.waitForCapture ? (
          <button className="ob-btn-primary" disabled style={{ opacity: 0.5, cursor: 'default' }}>
            Capture something above ↑
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

// ── Main Export ──────────────────────────────────────────────
export default function OnboardingTour({
  isNewUser,
  agents,
  observations,
  apiKey,
  userName,
  setActiveTab,
  onCaptureRef,  // ref that tour sets so Dashboard can call tour.onUserCaptured()
}) {
  // phase: 'welcome' | 'spotlight-N' | 'sdk' | 'done' | 'hidden'
  const [phase, setPhase] = useState('hidden');
  const [spotlightIdx, setSpotlightIdx] = useState(0);
  const [rect, setRect] = useState(null);
  const rafRef = useRef(null);

  // TOTAL steps for progress: welcome(0) + spotlight steps + sdk + done
  // For progress dots we show: 3 spotlight steps + sdk = 4 tour steps (0-3)
  const TOTAL_TOUR_STEPS = SPOTLIGHT_STEPS.length + 1; // +1 for sdk

  // Decide whether to show onboarding
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'done' || saved === 'skip') return;
    if (isNewUser) {
      // Small delay to let dashboard render first
      const t = setTimeout(() => setPhase('welcome'), 800);
      return () => clearTimeout(t);
    }
  }, [isNewUser]);

  // Track current spotlight step def
  const currentSpotlightDef = phase.startsWith('spotlight') ? SPOTLIGHT_STEPS[spotlightIdx] : null;

  // Navigate dashboard tab when spotlight step changes
  useEffect(() => {
    if (currentSpotlightDef?.tab) {
      setActiveTab(currentSpotlightDef.tab);
    }
  }, [spotlightIdx, currentSpotlightDef, setActiveTab]);

  // Measure target element for spotlight
  const measureTarget = useCallback(() => {
    if (!currentSpotlightDef) return;
    const el = document.getElementById(currentSpotlightDef.targetId);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const padding = currentSpotlightDef.padding || 8;
    setRect({
      top: r.top - padding,
      left: r.left - padding,
      width: r.width + padding * 2,
      height: r.height + padding * 2,
    });
  }, [currentSpotlightDef]);

  useEffect(() => {
    if (!currentSpotlightDef) { setRect(null); return; }
    // Wait for tab transition
    const t = setTimeout(() => {
      measureTarget();
    }, 200);
    return () => clearTimeout(t);
  }, [currentSpotlightDef, measureTarget]);

  // Resize handler
  useEffect(() => {
    if (!currentSpotlightDef) return;
    const onResize = () => measureTarget();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [currentSpotlightDef, measureTarget]);

  // Let Dashboard auto-advance the capture step
  useEffect(() => {
    if (!onCaptureRef) return;
    onCaptureRef.current = () => {
      const capIdx = SPOTLIGHT_STEPS.findIndex(s => s.waitForCapture);
      if (phase === 'spotlight' && spotlightIdx === capIdx) {
        advanceSpotlight();
      }
    };
  });

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, 'skip');
    setPhase('hidden');
  };

  const complete = () => {
    localStorage.setItem(STORAGE_KEY, 'done');
    setPhase('hidden');
  };

  const startTour = () => {
    setSpotlightIdx(0);
    setPhase('spotlight');
  };

  const advanceSpotlight = () => {
    if (spotlightIdx < SPOTLIGHT_STEPS.length - 1) {
      setSpotlightIdx(i => i + 1);
    } else {
      // After last spotlight → SDK modal
      setPhase('sdk');
    }
  };

  const advanceSdk = () => {
    setPhase('done');
    setActiveTab('overview');
  };

  if (phase === 'hidden') return null;

  if (phase === 'welcome') {
    return <WelcomeModal userName={userName} onStart={startTour} onSkip={skip} />;
  }

  if (phase === 'sdk') {
    const sdkStepIndex = SPOTLIGHT_STEPS.length; // after all spotlight steps
    return (
      <SdkModal
        apiKey={apiKey}
        onNext={advanceSdk}
        onSkip={skip}
        step={sdkStepIndex}
        total={TOTAL_TOUR_STEPS}
      />
    );
  }

  if (phase === 'done') {
    return <DoneModal onClose={complete} observationCount={observations.length} />;
  }

  // Spotlight phase
  if (phase === 'spotlight' && currentSpotlightDef) {
    return (
      <>
        {/* Dark overlay — clicking it does nothing (keep focus on tooltip) */}
        <div className="ob-overlay" onClick={(e) => e.stopPropagation()} />

        {/* Spotlight cutout */}
        {rect && (
          <div
            className="ob-spotlight"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          />
        )}

        {/* Tooltip */}
        {rect && (
          <SpotlightTooltip
            stepDef={currentSpotlightDef}
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
