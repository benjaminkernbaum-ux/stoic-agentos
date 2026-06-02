const FEATURES = [
  { icon: '🔗', title: 'Connect your tools', desc: 'Integrate with the services your team already relies on.' },
  { icon: '⏰', title: 'Run on a schedule', desc: 'Automate work — hourly, daily, or custom.' },
  { icon: '💬', title: 'Trigger from Slack', desc: 'Agents respond to messages and events automatically.' },
  { icon: '👥', title: 'Share across your workspace', desc: 'Give your whole team access to the agents you build.' },
  { icon: '🧠', title: 'Built-in memory', desc: 'Agents retain context across runs and get better over time.' },
  { icon: '📊', title: 'Full observability', desc: 'Debug, monitor, and audit every agent step with traces.' },
];

export default function WelcomeModal({ show, onClose, onGetStarted }) {
  if (!show) return null;

  return (
    <div className="fleet-welcome-backdrop" onClick={onClose}>
      <div className="fleet-welcome-modal" onClick={e => e.stopPropagation()}>
        <button className="fleet-welcome-close" onClick={onClose}>✕</button>

        <h2 className="fleet-welcome-title">Welcome to Stoic AgentOS</h2>
        <p className="fleet-welcome-sub">
          Create agents that handle complex tasks like research, inbox triage and project tracking.
        </p>

        <div className="fleet-welcome-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="fleet-welcome-card">
              <span className="fleet-welcome-card-icon">{f.icon}</span>
              <div>
                <div className="fleet-welcome-card-title">{f.title}</div>
                <div className="fleet-welcome-card-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="fleet-welcome-actions">
          <button className="fleet-welcome-skip" onClick={onClose}>Skip setup</button>
          <button className="fleet-welcome-go" onClick={onGetStarted}>
            Get started <span style={{ marginLeft: 6 }}>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
