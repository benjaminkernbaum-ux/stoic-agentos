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
          <div className="dash-brand-icon">⚡</div>
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
          {/* ── Search hint ── */}
          <button
            className="dash-nav-search-btn"
            onClick={() => setCmdOpen && setCmdOpen(true)}
          >
            <span className="dash-nav-search-icon">🔍</span>
            <span className="dash-nav-label">Search...</span>
            <span className="dash-nav-kbd">{isMac ? '⌘K' : 'Ctrl+K'}</span>
          </button>

          {[
            { id: 'traces',     icon: '📈', label: 'Traces' },
            { id: 'memory',     icon: '🧠', label: 'Memory' },
            { id: 'compliance', icon: '🛡️', label: 'Compliance' },
            { id: 'settings',   icon: '⚙️', label: 'Settings' },
          ].map(item => (
            <button
              key={item.id}
              className={`dash-nav-btn${activeTab === item.id ? ' active' : ''}`}
              onClick={() => handleTabClick(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              <span className="dash-nav-icon">{item.icon}</span>
              <span className="dash-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="dash-sidebar-foot">
          <div className="dash-plan-chip">
            <div className="dash-plan-dot" />
            <span className="dash-plan-text">{planName} PLAN</span>
          </div>

          <button className="dash-nav-btn" onClick={() => { if (window.confirm('Are you sure you want to sign out?')) handleLogout(); }}>
            <span className="dash-nav-icon">🚪</span>
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
