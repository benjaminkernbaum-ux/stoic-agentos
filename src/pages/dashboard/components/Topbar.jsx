/* Stoic redesign — same props/behavior as original Topbar, new visual layer */
import { useState, useEffect } from 'react';
import { TAB_TITLES } from '../constants';
import { getStoredTheme, setTheme, THEME_MODES } from '../../../lib/theme.js';

const THEME_ICONS = { dark: '🌙', light: '☀️', system: '🖥️' };
const THEME_LABELS = { dark: 'Dark', light: 'Light', system: 'System' };

export default function Topbar({ activeTab, setActiveTab, setCmdOpen, setCmdQuery, liveAgents, userName, orgName, firstInit, onMobileMenuToggle }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const [themeMode, setThemeMode] = useState(() => getStoredTheme());
  useEffect(() => {
    // Sync when the theme is changed in another tab.
    const onStorage = (e) => {
      if (e.key === 'agentos-theme') setThemeMode(getStoredTheme());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const cycleTheme = () => {
    const next = THEME_MODES[(THEME_MODES.indexOf(themeMode) + 1) % THEME_MODES.length];
    setThemeMode(next);
    setTheme(next);
  };

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
  const shortcutHint = isMac ? '⌘K' : 'Ctrl+K';

  return (
    <header className="dash-topbar">
      <button
        className="dash-mobile-hamburger"
        onClick={onMobileMenuToggle}
        aria-label="Open navigation"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
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
          borderRadius: 8,
          fontWeight: 600,
          textDecoration: 'none',
          fontSize: '0.8rem',
          marginRight: 6,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2l2.9 6.26L21.5 9.3l-4.75 4.3L18 20.5 12 17l-6 3.5 1.25-6.9L2.5 9.3l6.6-1.04L12 2z" />
        </svg>
        <span className="dash-capture-text">Star us</span>
      </a>

      <button
        type="button"
        onClick={cycleTheme}
        title={`Theme: ${THEME_LABELS[themeMode]} — click to cycle`}
        aria-label={`Theme: ${THEME_LABELS[themeMode]}, click to cycle`}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          padding: '6px 10px',
          borderRadius: 6,
          fontSize: 14,
          cursor: 'pointer',
          marginRight: 6,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          lineHeight: 1,
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <span aria-hidden="true">{THEME_ICONS[themeMode]}</span>
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
