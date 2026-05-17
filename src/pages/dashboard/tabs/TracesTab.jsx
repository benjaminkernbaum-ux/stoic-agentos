import TraceTimeline from '../../../components/TraceTimeline';

export default function TracesTab({ traces, traceStats, observations, agents, planName }) {
  return (
    <div className="dash-content">
      <div className="dash-panel" style={{ minHeight: 'calc(100vh - 140px)' }}>
        <div className="dash-panel-head">
          <span className="dash-panel-title">
            <span className="dash-panel-title-icon">📊</span>
            Agent Traces
            <span style={{ fontSize: 11, opacity: 0.4, marginLeft: 8 }}>
              {traces?.length > 0 ? 'Live instrumentation data' : 'Execution timeline'}
            </span>
          </span>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <TraceTimeline
            traces={traces}
            traceStats={traceStats}
            observations={observations}
            agents={agents}
            plan={planName?.toLowerCase() || 'free'}
          />
        </div>
      </div>
    </div>
  );
}
