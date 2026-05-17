import { TAB_TITLES } from '../constants';

export default function Topbar({ activeTab, setActiveTab, setCmdOpen, setCmdQuery, liveAgents, time, userName, orgName, firstInit }) {
  return (
    <header className="dash-topbar">
      <span className="dash-topbar-title">{TAB_TITLES[activeTab]}</span>
      <div className="dash-topbar-divider" />
      <button
        className="dash-search-btn"
        onClick={() => { setCmdOpen(true); setCmdQuery(''); }}
      >
        <span className="dash-search-icon">🔍</span>
        <span className="dash-search-text">Search everything...</span>
        <span className="dash-search-shortcut">
          <span className="dash-kbd">⌘</span>
          <span className="dash-kbd">K</span>
        </span>
      </button>
      <div className="dash-topbar-spacer" />
      <div className="dash-live-indicator">
        <div className="dash-live-dot" />
        {liveAgents} live
      </div>
      <span className="dash-time">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
      <button
        className="dash-topbar-capture"
        onClick={() => setActiveTab('overview')}
      >
        + Capture
      </button>
      <div
        className="dash-avatar"
        onClick={() => setActiveTab('settings')}
        title={`${userName} — ${orgName}`}
      >
        {firstInit}
      </div>
    </header>
  );
}
