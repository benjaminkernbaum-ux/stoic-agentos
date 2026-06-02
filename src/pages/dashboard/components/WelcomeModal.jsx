import { useState } from 'react';

const STEPS = [
  {
    icon: '🛰️', title: 'Welcome to Stoic AgentOS',
    desc: 'Your autonomous agent operating system. Build, deploy, and manage AI agents that work around the clock.',
    features: [
      { icon: '🤖', title: 'Deploy agents', desc: 'Create agents that handle complex tasks autonomously.' },
      { icon: '🔗', title: 'Connect tools', desc: 'Integrate with GitHub, Slack, databases, and 20+ services.' },
      { icon: '🧠', title: 'Built-in memory', desc: 'Agents learn from past runs and get better over time.' },
    ],
  },
  {
    icon: '⚡', title: 'Your Superpowers',
    desc: 'Here\'s what makes Stoic different from every other agent platform.',
    features: [
      { icon: '📡', title: 'Signal feed', desc: 'Real-time alerts, reports, and digests from all your agents.' },
      { icon: '🕸️', title: 'Knowledge graph', desc: 'Visual map of everything your agents discover.' },
      { icon: '🛡️', title: 'Circuit breakers', desc: 'Automatic safety limits that prevent runaway costs.' },
    ],
  },
  {
    icon: '🚀', title: 'Ready to Launch',
    desc: 'Choose how you want to start. You can always change this later.',
    features: [
      { icon: '💬', title: 'Chat with AI', desc: 'Describe what you need, we\'ll build the agent.' },
      { icon: '🧬', title: 'Use a blueprint', desc: 'Start from a pre-built, battle-tested template.' },
      { icon: '✏️', title: 'Build from scratch', desc: 'Full control — configure every setting yourself.' },
    ],
  },
];

export default function WelcomeModal({ show, onClose, onGetStarted }) {
  const [step, setStep] = useState(0);

  if (!show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="welcome-backdrop" onClick={onClose}>
      <div className="welcome-modal" onClick={e => e.stopPropagation()}>
        <button className="welcome-close" onClick={onClose}>✕</button>

        {/* Step indicator */}
        <div className="welcome-steps">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`welcome-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="welcome-icon">{current.icon}</div>
        <h2 className="welcome-title">{current.title}</h2>
        <p className="welcome-desc">{current.desc}</p>

        <div className="welcome-features">
          {current.features.map(f => (
            <div key={f.title} className="welcome-feature">
              <span className="welcome-feature-icon">{f.icon}</span>
              <div>
                <div className="welcome-feature-title">{f.title}</div>
                <div className="welcome-feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="welcome-actions">
          <button className="welcome-skip" onClick={onClose}>Skip setup</button>
          <div className="welcome-actions-right">
            {step > 0 && (
              <button className="welcome-back" onClick={() => setStep(s => s - 1)}>← Back</button>
            )}
            {isLast ? (
              <button className="welcome-launch" onClick={onGetStarted}>
                Launch Mission Control 🚀
              </button>
            ) : (
              <button className="welcome-next" onClick={() => setStep(s => s + 1)}>
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
