/* Stoic redesign — same props/behavior as original Sidebar, new visual layer */

const I = {
  traces: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 5h13M3 10h18M3 15h9M3 20h15" strokeLinecap="round" />
    </svg>
  ),
  memory: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
    </svg>
  ),
  compliance: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  ),
  signout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  brandMark: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#CE9B4F" strokeWidth="1.5">
      <path d="M4 20h16M6 20V9M18 20V9M10 20v-7M14 20v-7M3 9h18l-9-5-9 5z" strokeLinejoin="round" />
    </svg>
  ),
};

const NAV_SECTIONS = [
  {
    label: 'Observability',
    items: [
      { id: 'traces', icon: I.traces, label: 'Traces' },
      { id: 'compliance', icon: I.compliance, label: 'Compliance' },
    ],
  },
  {
    label: 'Cognition',
    items: [
      { id: 'memory', icon: I.memory, label: 'Memory' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { id: 'settings', icon: I.settings, label: 'Settings' },
    ],
  },
];

export default function Sidebar({ sidebarOpen, setSidebarOpen, activeTab, setActiveTab, liveAgents, errorAgents, planName, handleLogout, mobileSidebarOpen, setMobileSidebarOpen, setShowAgentModal, setCmdOpen }) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

  const handleTabClick = (id) => {
    setActiveTab(id);
    if (setMobileSidebarOpen) setMobileSidebarOpen(false);
  };

  return (
    <>
      {mobileSidebarOpen && (
        <div
          className="dash-sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside className={`dash-sidebar${sidebarOpen ? '' : ' collapsed'}${mobileSidebarOpen ? ' mobile-open' : ''}`}>
        <div className="dash-brand">
          <div className="dash-brand-icon">{I.brandMark}</div>
          {(sidebarOpen || mobileSidebarOpen) && (
            <>
              <span className="dash-brand-name">AgentOS</span>
              <span className="dash-brand-version">v3</span>
            </>
          )}
          {mobileSidebarOpen && (
            <button
              className="dash-mobile-close"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          )}
        </div>

        <nav className="dash-nav">
          <button
            className="dash-nav-search-btn"
            onClick={() => setCmdOpen && setCmdOpen(true)}
          >
            <span className="dash-nav-search-icon">{I.search}</span>
            <span className="dash-nav-label">Search...</span>
            <span className="dash-nav-kbd">{isMac ? '⌘K' : 'Ctrl+K'}</span>
          </button>

          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <div className="st-nav-label">{section.label}</div>
              {section.items.map(item => (
                <button
                  key={item.id}
                  className={`dash-nav-btn${activeTab === item.id ? ' active' : ''}`}
                  onClick={() => handleTabClick(item.id)}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                >
                  <span className="dash-nav-icon">{item.icon}</span>
                  <span className="dash-nav-label">{item.label}</span>
                  {item.id === 'traces' && liveAgents > 0 && (
                    <span className="st-nav-badge" title={`${liveAgents} live agents`}>{liveAgents}</span>
                  )}
                  {item.id === 'compliance' && errorAgents > 0 && (
                    <span className="st-nav-badge" title={`${errorAgents} agents in error`}>{errorAgents}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="dash-sidebar-foot">
          <div className="dash-plan-chip">
            <div className="dash-plan-dot" />
            <span className="dash-plan-text">{planName} PLAN</span>
          </div>

          <button className="dash-nav-btn" onClick={() => { if (window.confirm('Are you sure you want to sign out?')) handleLogout(); }}>
            <span className="dash-nav-icon">{I.signout}</span>
            <span className="dash-nav-label">Sign out</span>
          </button>

          <button
            className="dash-collapse-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '◂' : '▸'}
          </button>
        </div>
      </aside>
    </>
  );
}
