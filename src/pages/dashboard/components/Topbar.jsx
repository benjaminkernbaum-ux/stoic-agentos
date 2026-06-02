import { TAB_TITLES } from '../constants';

export default function Topbar({ activeTab, setActiveTab, setCmdOpen, setCmdQuery, liveAgents, time, userName, orgName, firstInit, onMobileMenuToggle }) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
  const shortcutHint = isMac ? '⌘K' : 'Ctrl+K';
  return (
    <header className="dash-topbar">
      {/* Mobile hamburger toggle */}
      <button
        className="dash-mobile-hamburger"
        onClick={onMobileMenuToggle}
        aria-label="Open navigation"
      >
        ☰
      </button>
      <span className="dash-topbar-title">{TAB_TITLES[activeTab]}</span>
      <div className="dash-topbar-divider" />
      <button
        className="dash-search-btn"
        onClick={() => { setCmdOpen(true); setCmdQuery(''); }}
        aria-label={`Search or jump to (${shortcutHint})`}
      >
        <span className="dash-search-icon" style={{ opacity: 0.5, fontSize: 11 }}>{shortcutHint}</span>
        <span className="dash-search-text">Search or jump to...</span>
      </button>
      <div className="dash-topbar-spacer" />
      <div className="dash-live-indicator">
        <div className="dash-live-dot" />
        {liveAgents} live
      </div>
      <span className="dash-time">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      <a
        href="https://github.com/benjaminkernbaum-ux/stoic-agentos"
        target="_blank"
        rel="noopener noreferrer"
        className="dash-topbar-star"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 12px',
          borderRadius: 6,
          background: 'rgba(255,185,0,0.1)',
          border: '1px solid rgba(255,185,0,0.25)',
          color: '#ffb900',
          fontWeight: 600,
          textDecoration: 'none',
          fontSize: '0.8rem',
          marginRight: 6,
        }}
      >
        ⭐ <span className="dash-capture-text">Star us</span>
      </a>
      <button
        className="dash-topbar-capture"
        onClick={() => setActiveTab('overview')}
        aria-label="Quick capture observation"
        style={{
          background: 'var(--surface-4)',
          border: '1px solid var(--line-mid)',
          boxShadow: 'none',
          fontWeight: 500,
          letterSpacing: 0,
        }}
      >
        <span className="dash-capture-text">+ Capture</span>
        <span className="dash-capture-icon-only">+</span>
      </button>
      <button
        className="dash-avatar"
        onClick={() => setActiveTab('settings')}
        title={`${userName} — ${orgName}`}
        aria-label={`${userName} settings`}
      >
        {firstInit}
      </button>
    </header>
  );
}
