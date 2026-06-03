import { useState } from 'react';
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

export function AgentDetailModal({ agent, onClose, onToggleStatus, onRunAgent, workspaces = [] }) {
  const [task, setTask] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);

  if (!agent) return null;

  // Set default workspace if available
  if (workspaces.length > 0 && !selectedWorkspace) {
    setSelectedWorkspace(workspaces[0].id);
  }

  const handleRun = async (e) => {
    e.preventDefault();
    setRunning(true);
    setRunResult(null);
    try {
      const res = await onRunAgent(agent.id, task, selectedWorkspace);
      if (res && res.success) {
        setRunResult(res.response);
        setTask('');
      } else {
        setRunResult(`[Error] Execution failed: ${res?.error || 'Unknown error'}`);
      }
    } catch (err) {
      setRunResult(`[Error] Network request failed.`);
    }
    setRunning(false);
  };

  const handleClose = () => {
    setTask('');
    setRunResult(null);
    setRunning(false);
    onClose();
  };

  return (
    <div className="cmd-backdrop" onClick={handleClose}>
      <div className="cmd-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
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
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 16 }}>ID: {agent.id}</div>

        {/* Live Execution Form */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, marginBottom: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>
            ⚡ Direct Execution Hub
          </h4>
          <form onSubmit={handleRun} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase' }}>Target Workspace</label>
              <select 
                value={selectedWorkspace} 
                onChange={e => setSelectedWorkspace(e.target.value)}
                style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', width: '100%' }}
              >
                {workspaces.map(w => (
                  <option key={w.id} value={w.id} style={{ background: '#1c1c24' }}>
                    {w.name} ({w.stack || 'General'})
                  </option>
                ))}
                {workspaces.length === 0 && (
                  <option value="" style={{ background: '#1c1c24' }}>No workspaces registered</option>
                )}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase' }}>Task Details</label>
              <textarea 
                placeholder="Describe what task the agent should perform (e.g. scrape targets, draft pitch, inspect logs)..."
                value={task}
                required
                onChange={e => setTask(e.target.value)}
                rows={2}
                style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary btn-sm" 
              disabled={running}
              style={{ padding: '8px 16px', fontSize: 12, width: '100%', justifyContent: 'center' }}
            >
              {running ? '⚙️ Running Agent (Claude)...' : '⚡ Trigger Autonomous Agent Run'}
            </button>
          </form>
        </div>

        {/* Live Output Feed */}
        {runResult && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📊 Claude Execution Output</span>
              <button 
                onClick={() => setRunResult(null)} 
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Clear
              </button>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', padding: 12, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
              {runResult}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onToggleStatus(agent.id, agent.status)}>
            ⚡ Toggle Status → {AGENT_STATUSES[(AGENT_STATUSES.indexOf(agent.status || 'idle') + 1) % AGENT_STATUSES.length]}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>Close</button>
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
