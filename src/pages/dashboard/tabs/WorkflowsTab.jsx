import WorkflowCanvas from '../../../components/WorkflowCanvas';

export default function WorkflowsTab({ agents, observations, workspaces, planName, handleUpgrade }) {
  return (
    <div className="dash-content" style={{ height: 'calc(100vh - 80px)' }}>
      <div className="dash-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="dash-panel-head">
          <span className="dash-panel-title">
            <span className="dash-panel-title-icon">🔗</span>
            Agent Workflows
            <span style={{ fontSize: 11, opacity: 0.4, marginLeft: 8 }}>
              {agents.length} agents · {observations.length} observations
            </span>
          </span>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <WorkflowCanvas
            agents={agents}
            observations={observations}
            workspaces={workspaces}
            plan={planName?.toLowerCase() || 'free'}
            onUpgrade={handleUpgrade}
          />
        </div>
      </div>
    </div>
  );
}
