export default function WorkspacesTab({ workspaces, setShowWsModal }) {
  return (
    <div className="dash-content">
      <div className="dash-ws-grid">
        {workspaces.map(ws => (
          <div key={ws.id} className="dash-ws-card">
            <div className="dash-ws-card-top">
              <div className="dash-ws-card-icon">📦</div>
              <span className="dash-ws-card-name">{ws.name}</span>
              <div className={`dash-ws-status-dot ${ws.status || 'inactive'}`} />
            </div>
            <div className="dash-ws-meta">
              <span className="dash-ws-tag">🌿 {ws.branch || 'main'}</span>
              {ws.stack && <span className="dash-ws-tag">🛠 {ws.stack}</span>}
            </div>
          </div>
        ))}
        <button className="dash-ws-card dash-ws-add" onClick={() => setShowWsModal(true)}>
          <span className="dash-ws-add-icon">+</span>
          <span>Add Workspace</span>
        </button>
      </div>
      {workspaces.length === 0 && (
        <div className="dash-panel" style={{ marginTop: 14 }}>
        <div className="dash-empty" style={{ padding: 60 }}>
            <div className="dash-empty-icon">📦</div>
            <h4>No workspaces connected</h4>
            <p>Add a workspace manually or use the SDK to auto-create them.</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => setShowWsModal(true)}>+ Add Workspace</button>
          </div>
        </div>
      )}
    </div>
  );
}
