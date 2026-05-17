import { STATUS_COLORS } from '../constants';

export default function AgentsTab({ agents, setShowAgentModal, setSelectedAgent, handleSeedDemo, seedLoading }) {
  return (
    <div className="dash-content">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAgentModal(true)}>+ Register Agent</button>
      </div>
      {agents.length > 0 ? (
        <div className="dash-agent-grid">
          {agents.map(agent => (
            <div key={agent.id} className="dash-agent-card" onClick={() => setSelectedAgent(agent)} style={{ cursor: 'pointer' }}>
              <div className="dash-agent-card-top">
                <span className="dash-agent-card-name">{agent.name}</span>
                <span className={`dash-agent-status-badge ${agent.status || 'idle'}`}>
                  {agent.status || 'idle'}
                </span>
              </div>
              {agent.description && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '6px 0 8px', lineHeight: 1.4 }}>{agent.description}</div>}
              <div className="dash-agent-card-stats">
                <div className="dash-agent-stat">
                  <span className="dash-agent-stat-val">{agent.total_runs || 0}</span>
                  <span className="dash-agent-stat-lbl">Runs</span>
                </div>
                <div className="dash-agent-stat">
                  <span className={`dash-agent-stat-val${(agent.total_errors || 0) > 0 ? ' err' : ''}`}>
                    {agent.total_errors || 0}
                  </span>
                  <span className="dash-agent-stat-lbl">Errors</span>
                </div>
              </div>
              <div className="dash-agent-card-foot">
                <span className="dash-agent-module">{agent.module}</span>
                <span className="dash-agent-heartbeat">
                  {agent.last_heartbeat
                    ? new Date(agent.last_heartbeat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Never'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dash-panel">
          <div className="dash-empty" style={{ padding: 60 }}>
            <div className="dash-empty-icon">🤖</div>
            <h4>Register your first agent</h4>
            <p>Create agents manually or use the SDK to auto-register them.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAgentModal(true)}>+ Register Agent</button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleSeedDemo()} disabled={seedLoading}>{seedLoading ? '...' : '⚡ Seed Demo'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
