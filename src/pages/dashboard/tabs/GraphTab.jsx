import KnowledgeGraph from '../../../components/KnowledgeGraph';

export default function GraphTab({ observations, agents, handleUpgrade, upgradeLoading, toast }) {
  return (
    <div className="dash-content" style={{ height: 'calc(100vh - 80px)' }}>
      <div className="dash-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="dash-panel-head">
          <span className="dash-panel-title">
            <span className="dash-panel-title-icon">🕸️</span>
            Knowledge Graph
            <span style={{ fontSize: 11, opacity: 0.4, marginLeft: 8 }}>
              {observations.length > 50 ? '50 / ' + observations.length + ' nodes (Free tier)' : observations.length + ' nodes'}
            </span>
          </span>
          {observations.length > 0 && (
            <button className="dash-panel-action" onClick={() => {
              const data = JSON.stringify(observations, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'agentos-observations.json'; a.click();
              URL.revokeObjectURL(url);
              toast('Exported observations as JSON', 'success');
            }}>Export JSON →</button>
          )}
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <KnowledgeGraph
            observations={observations}
            agents={agents}
            onUpgrade={handleUpgrade}
            upgradeLoading={upgradeLoading}
          />
        </div>
      </div>
    </div>
  );
}
