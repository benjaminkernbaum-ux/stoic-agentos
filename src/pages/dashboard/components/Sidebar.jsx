export default function Sidebar({ sidebarOpen, setSidebarOpen, activeTab, setActiveTab, liveAgents, errorAgents, planName, handleLogout, mobileSidebarOpen, setMobileSidebarOpen, setShowAgentModal }) {
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
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
          >
            <span className="dash-nav-search-icon">🔍</span>
            <span className="dash-nav-label">Search...</span>
            <span className="dash-nav-kbd">{isMac ? '⌘K' : 'Ctrl+K'}</span>
          </button>

          {/* ── Main ── */}
          {[
            { id: 'chat',    icon: '🛰️', label: 'Mission Comms', badge: null },
            { id: 'inbox',   icon: '📡', label: 'Signal Feed',   badge: null },
          ].map(item => (
            <button
              key={item.id}
              className={`dash-nav-btn${activeTab === item.id ? ' active' : ''}`}
              onClick={() => handleTabClick(item.id)}
            >
              <span className="dash-nav-icon">{item.icon}</span>
              <span className="dash-nav-label">{item.label}</span>
              {item.badge && (
                <span className={`dash-nav-badge ${item.badge.color}`}>{item.badge.text}</span>
              )}
            </button>
          ))}

          {/* ── Explore ── */}
          <div className="dash-nav-section">EXPLORE</div>
          {[
            { id: 'agents',       icon: '🤖', label: 'Agents',          badge: liveAgents > 0 ? { text: liveAgents, color: 'green' } : null },
            { id: 'templates',    icon: '🧬', label: 'Blueprints',      badge: null },
            { id: 'integrations', icon: '🔌', label: 'Connect Hub',     badge: null },
            { id: 'skills',       icon: '🧩', label: 'Capabilities',    badge: null },
          ].map(item => (
            <button
              key={item.id}
              className={`dash-nav-btn${activeTab === item.id ? ' active' : ''}`}
              onClick={() => handleTabClick(item.id)}
            >
              <span className="dash-nav-icon">{item.icon}</span>
              <span className="dash-nav-label">{item.label}</span>
              {item.badge && (
                <span className={`dash-nav-badge ${item.badge.color}`}>{item.badge.text}</span>
              )}
            </button>
          ))}

          {/* ── Deploy ── */}
          <div className="dash-nav-section">DEPLOY</div>
          <button className="dash-nav-btn dash-nav-action" onClick={() => handleTabClick('chat')}>
            <span className="dash-nav-icon">✨</span>
            <span className="dash-nav-label">Brief an agent</span>
          </button>
          <button className="dash-nav-btn dash-nav-action" onClick={() => handleTabClick('templates')}>
            <span className="dash-nav-icon">🧬</span>
            <span className="dash-nav-label">Deploy blueprint</span>
          </button>
          <button className="dash-nav-btn dash-nav-action" onClick={() => { if (setShowAgentModal) setShowAgentModal(true); }}>
            <span className="dash-nav-icon">✏️</span>
            <span className="dash-nav-label">Build from scratch</span>
          </button>

          {/* ── Operate ── */}
          <div className="dash-nav-section">OPERATE</div>
          {[
            { id: 'commandcenter', icon: '🎛️', label: 'Command Center', badge: { text: 'HQ', color: 'purple' } },
            { id: 'overview',   icon: '📊', label: 'Overview',   badge: errorAgents > 0 ? { text: errorAgents, color: 'red' } : null },
            { id: 'workspaces', icon: '📦', label: 'Workspaces', badge: null },
            { id: 'brain',      icon: '💡', label: 'Brain',      badge: null },
            { id: 'graph',      icon: '🕸️', label: 'Graph',      badge: null },
            { id: 'traces',     icon: '📈', label: 'Traces',     badge: null },
            { id: 'workflows',  icon: '🔗', label: 'Workflows',  badge: null },
            { id: 'memory',     icon: '🧠', label: 'Memory',     badge: null },
            { id: 'compliance', icon: '🛡️', label: 'Compliance', badge: null },
            { id: 'teamhq',     icon: '🏢', label: 'Team HQ',    badge: null },
          ].map(item => (
            <button
              key={item.id}
              className={`dash-nav-btn${activeTab === item.id ? ' active' : ''}`}
              onClick={() => handleTabClick(item.id)}
            >
              <span className="dash-nav-icon">{item.icon}</span>
              <span className="dash-nav-label">{item.label}</span>
              {item.badge && (
                <span className={`dash-nav-badge ${item.badge.color}`}>{item.badge.text}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="dash-sidebar-foot">
          {/* Usage & Settings */}
          <button
            className={`dash-nav-btn${activeTab === 'settings' ? ' active' : ''}`}
            onClick={() => handleTabClick('settings')}
          >
            <span className="dash-nav-icon">⚙️</span>
            <span className="dash-nav-label">Settings</span>
          </button>

          <div className="dash-plan-chip">
            <div className="dash-plan-dot" />
            <span className="dash-plan-text">{planName} PLAN</span>
          </div>

          <button className="dash-nav-btn" onClick={handleLogout}>
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
