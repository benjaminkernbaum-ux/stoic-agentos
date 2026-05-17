export default function Sidebar({ sidebarOpen, setSidebarOpen, activeTab, setActiveTab, liveAgents, errorAgents, planName, handleLogout }) {
  return (
    <aside className={`dash-sidebar${sidebarOpen ? '' : ' collapsed'}`}>
      <div className="dash-brand">
        <div className="dash-brand-icon">⚡</div>
        {sidebarOpen && (
          <>
            <span className="dash-brand-name">AgentOS</span>
            <span className="dash-brand-version">v2</span>
          </>
        )}
      </div>

      <nav className="dash-nav">
        <div className="dash-nav-section">Main</div>

        {[
          { id: 'commandcenter', icon: '⚡', label: 'Command Center', badge: { text: 'HQ', color: 'purple' } },
          { id: 'overview',   icon: '📊', label: 'Overview',   badge: errorAgents > 0 ? { text: errorAgents, color: 'red' } : null },
          { id: 'agents',     icon: '🤖', label: 'Agents',     badge: liveAgents > 0 ? { text: liveAgents, color: 'green' } : null },
          { id: 'workspaces', icon: '📦', label: 'Workspaces', badge: null },
          { id: 'brain',      icon: '🧠', label: 'Brain',      badge: null },
          { id: 'graph',      icon: '🕸️', label: 'Graph',      badge: null },
          { id: 'traces',     icon: '📊', label: 'Traces',     badge: null },
          { id: 'workflows',  icon: '🔗', label: 'Workflows',  badge: null },
        ].map(item => (
          <button
            key={item.id}
            className={`dash-nav-btn${activeTab === item.id ? ' active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="dash-nav-icon">{item.icon}</span>
            <span className="dash-nav-label">{item.label}</span>
            {item.badge && (
              <span className={`dash-nav-badge ${item.badge.color}`}>{item.badge.text}</span>
            )}
          </button>
        ))}

        <div className="dash-nav-section" style={{ marginTop: 8 }}>System</div>

        <button
          id="ob-nav-settings"
          className={`dash-nav-btn${activeTab === 'settings' ? ' active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="dash-nav-icon">⚙️</span>
          <span className="dash-nav-label">Settings</span>
        </button>
      </nav>

      <div className="dash-sidebar-foot">
        <div className="dash-plan-chip">
          <div className="dash-plan-dot" />
          <span className="dash-plan-text">{planName} PLAN</span>
        </div>
        <div className="dash-kbd-hint">
          <span className="dash-kbd">⌘</span>
          <span className="dash-kbd">K</span>
          <span style={{ marginLeft: 4 }}>Command palette</span>
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
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </div>
    </aside>
  );
}
