import { AGENT_STATUSES } from '../constants';

export function AgentModal({ show, agentForm, setAgentForm, onSubmit, onClose }) {
  if (!show) return null;
  return (
    <div className="cmd-backdrop" onClick={onClose}>
      <div className="cmd-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 28 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Register Agent</h3>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="Agent name (e.g. content-writer)" required value={agentForm.name} onChange={e => setAgentForm({...agentForm, name: e.target.value})} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }} />
          <input placeholder="Module (e.g. engineering, content, analytics)" value={agentForm.module} onChange={e => setAgentForm({...agentForm, module: e.target.value})} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }} />
          <textarea placeholder="Description (optional)" value={agentForm.description} onChange={e => setAgentForm({...agentForm, description: e.target.value})} rows={3} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'var(--font-body)' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">Register Agent</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function WorkspaceModal({ show, wsForm, setWsForm, onSubmit, onClose }) {
  if (!show) return null;
  return (
    <div className="cmd-backdrop" onClick={onClose}>
      <div className="cmd-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 28 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Add Workspace</h3>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="Workspace name (e.g. stoic-agentos)" required value={wsForm.name} onChange={e => setWsForm({...wsForm, name: e.target.value})} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }} />
          <input placeholder="Branch (default: main)" value={wsForm.branch} onChange={e => setWsForm({...wsForm, branch: e.target.value})} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }} />
          <input placeholder="Stack (e.g. React, Python, Node.js)" value={wsForm.stack} onChange={e => setWsForm({...wsForm, stack: e.target.value})} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">Add Workspace</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AgentDetailModal({ agent, onClose, onToggleStatus }) {
  if (!agent) return null;
  return (
    <div className="cmd-backdrop" onClick={onClose}>
      <div className="cmd-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(155,89,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{agent.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{agent.module || 'No module'}</div>
          </div>
          <span className={`dash-agent-status-badge ${agent.status || 'idle'}`} style={{ marginLeft: 'auto' }}>{agent.status || 'idle'}</span>
        </div>
        {agent.description && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16, lineHeight: 1.5 }}>{agent.description}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div style={{ padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 10, textAlign: 'center', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent-cyan)' }}>{agent.total_runs || 0}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Runs</div>
          </div>
          <div style={{ padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 10, textAlign: 'center', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: (agent.total_errors || 0) > 0 ? '#ff4757' : 'var(--accent-green)' }}>{agent.total_errors || 0}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Errors</div>
          </div>
          <div style={{ padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 10, textAlign: 'center', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-purple)' }}>{agent.last_heartbeat ? new Date(agent.last_heartbeat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Last Heartbeat</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>ID: {agent.id}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onToggleStatus(agent.id, agent.status)}>
            ⚡ Toggle Status → {AGENT_STATUSES[(AGENT_STATUSES.indexOf(agent.status || 'idle') + 1) % AGENT_STATUSES.length]}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export function KnowledgeItemModal({ show, kiForm, setKiForm, onSubmit, onClose }) {
  if (!show) return null;
  return (
    <div className="cmd-backdrop" onClick={onClose}>
      <div className="cmd-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, padding: 28 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Create Knowledge Item</h3>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Persist important decisions, patterns, and discoveries for your team.</p>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            placeholder="Name (e.g. API Rate Limiting Strategy)"
            required
            value={kiForm.name}
            onChange={e => setKiForm({...kiForm, name: e.target.value})}
            style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-mid)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}
          />
          <input
            placeholder="Summary (one-liner)"
            value={kiForm.summary}
            onChange={e => setKiForm({...kiForm, summary: e.target.value})}
            style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-mid)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}
          />
          <textarea
            placeholder="Content / details (markdown supported)"
            value={kiForm.content}
            onChange={e => setKiForm({...kiForm, content: e.target.value})}
            rows={5}
            style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-mid)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: "'SF Mono', 'JetBrains Mono', monospace" }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">Create Item</button>
          </div>
        </form>
      </div>
    </div>
  );
}
