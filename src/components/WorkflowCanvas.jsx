import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ── Custom Node Types ──────────────────────────────────────────

function TriggerNode({ data }) {
  return (
    <div style={{
      padding: '12px 20px', borderRadius: 12, minWidth: 160,
      background: 'linear-gradient(135deg, rgba(155,89,255,0.15), rgba(155,89,255,0.05))',
      border: '1px solid rgba(155,89,255,0.4)', boxShadow: '0 4px 20px rgba(155,89,255,0.15)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>{data.icon || '⚡'}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#9b59ff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {data.label}
        </span>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{data.description}</div>
      <Handle type="source" position={Position.Right} style={{ background: '#9b59ff', width: 8, height: 8, border: '2px solid #1a1a2e' }} />
    </div>
  );
}

function AgentNode({ data }) {
  const statusColors = { running: '#00e68a', idle: '#ffa726', paused: '#ff8c42', error: '#ff4757', disabled: '#666' };
  return (
    <div style={{
      padding: '12px 20px', borderRadius: 12, minWidth: 180,
      background: 'linear-gradient(135deg, rgba(0,180,216,0.12), rgba(0,180,216,0.04))',
      border: '1px solid rgba(0,180,216,0.35)', boxShadow: '0 4px 20px rgba(0,180,216,0.1)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#00b4d8', width: 8, height: 8, border: '2px solid #1a1a2e' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>{data.icon || '🤖'}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#00b4d8' }}>{data.label}</span>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', marginLeft: 'auto',
          background: statusColors[data.status] || '#666',
          boxShadow: `0 0 6px ${statusColors[data.status] || '#666'}`,
        }} />
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{data.description}</div>
      {data.stats && (
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
            <strong style={{ color: '#00e68a' }}>{data.stats.runs}</strong> runs
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
            <strong style={{ color: '#ff4757' }}>{data.stats.errors}</strong> errors
          </span>
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#00b4d8', width: 8, height: 8, border: '2px solid #1a1a2e' }} />
    </div>
  );
}

function ToolNode({ data }) {
  return (
    <div style={{
      padding: '12px 20px', borderRadius: 12, minWidth: 160,
      background: 'linear-gradient(135deg, rgba(255,140,66,0.12), rgba(255,140,66,0.04))',
      border: '1px solid rgba(255,140,66,0.35)', boxShadow: '0 4px 20px rgba(255,140,66,0.1)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#ff8c42', width: 8, height: 8, border: '2px solid #1a1a2e' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>{data.icon || '🔧'}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#ff8c42', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {data.label}
        </span>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{data.description}</div>
      <Handle type="source" position={Position.Right} style={{ background: '#ff8c42', width: 8, height: 8, border: '2px solid #1a1a2e' }} />
    </div>
  );
}

function OutputNode({ data }) {
  return (
    <div style={{
      padding: '12px 20px', borderRadius: 12, minWidth: 160,
      background: 'linear-gradient(135deg, rgba(0,230,138,0.12), rgba(0,230,138,0.04))',
      border: '1px solid rgba(0,230,138,0.35)', boxShadow: '0 4px 20px rgba(0,230,138,0.1)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#00e68a', width: 8, height: 8, border: '2px solid #1a1a2e' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>{data.icon || '📤'}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#00e68a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {data.label}
        </span>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{data.description}</div>
    </div>
  );
}

function MemoryNode({ data }) {
  return (
    <div style={{
      padding: '12px 20px', borderRadius: 12, minWidth: 160,
      background: 'linear-gradient(135deg, rgba(78,205,196,0.12), rgba(78,205,196,0.04))',
      border: '1px dashed rgba(78,205,196,0.4)', boxShadow: '0 4px 20px rgba(78,205,196,0.1)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#4ecdc4', width: 8, height: 8, border: '2px solid #1a1a2e' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>{data.icon || '🧠'}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#4ecdc4', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {data.label}
        </span>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{data.description}</div>
      <Handle type="source" position={Position.Right} style={{ background: '#4ecdc4', width: 8, height: 8, border: '2px solid #1a1a2e' }} />
      <Handle type="source" position={Position.Bottom} id="feedback" style={{ background: '#4ecdc4', width: 8, height: 8, border: '2px solid #1a1a2e' }} />
    </div>
  );
}

const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  tool: ToolNode,
  output: OutputNode,
  memory: MemoryNode,
};

// ── Generate workflow from real agent data ──────────────────────

function buildWorkflow(agents, observations, workspaces) {
  const nodes = [];
  const edges = [];
  let y = 0;

  // Trigger node
  nodes.push({
    id: 'trigger-webhook',
    type: 'trigger',
    position: { x: 50, y: 120 },
    data: { label: 'Webhook Trigger', description: 'Git push / API call / Cron', icon: '⚡' },
  });

  // Agent nodes (from real data)
  if (agents?.length) {
    agents.forEach((agent, i) => {
      const nodeId = `agent-${agent.id || i}`;
      nodes.push({
        id: nodeId,
        type: 'agent',
        position: { x: 320, y: 40 + i * 160 },
        data: {
          label: agent.name || `Agent ${i + 1}`,
          description: agent.description || 'AI agent',
          icon: '🤖',
          status: agent.status || 'idle',
          stats: { runs: agent.total_runs || 0, errors: agent.total_errors || 0 },
        },
      });

      // Connect trigger → agent
      edges.push({
        id: `e-trigger-${nodeId}`,
        source: 'trigger-webhook',
        target: nodeId,
        animated: true,
        style: { stroke: '#9b59ff', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#9b59ff' },
      });
    });
  } else {
    // Default demo agent
    nodes.push({
      id: 'agent-demo',
      type: 'agent',
      position: { x: 320, y: 120 },
      data: { label: 'content-writer', description: 'Generates blog posts and social copy', icon: '🤖', status: 'running', stats: { runs: 142, errors: 3 } },
    });
    edges.push({
      id: 'e-trigger-demo',
      source: 'trigger-webhook',
      target: 'agent-demo',
      animated: true,
      style: { stroke: '#9b59ff', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#9b59ff' },
    });
  }

  // Memory node (Brain)
  nodes.push({
    id: 'memory-brain',
    type: 'memory',
    position: { x: 320, y: agents?.length ? 40 + agents.length * 160 : 300 },
    data: {
      label: 'Knowledge Brain',
      description: `${observations?.length || 0} observations stored`,
      icon: '🧠',
    },
  });

  // Tool nodes
  const obsTypes = [...new Set((observations || []).map(o => o.type).filter(Boolean))];
  const toolX = 620;
  const tools = [
    { id: 'tool-supabase', label: 'Supabase DB', description: 'PostgreSQL queries', icon: '🗄️' },
    { id: 'tool-llm', label: 'LLM API', description: 'Claude / GPT inference', icon: '🧠' },
    { id: 'tool-mcp', label: 'MCP Tools', description: '13 callable operations', icon: '🔌' },
  ];

  tools.forEach((tool, i) => {
    nodes.push({
      id: tool.id,
      type: 'tool',
      position: { x: toolX, y: 40 + i * 130 },
      data: { label: tool.label, description: tool.description, icon: tool.icon },
    });

    // Connect first agent → tools
    const agentId = agents?.length ? `agent-${agents[0].id || 0}` : 'agent-demo';
    edges.push({
      id: `e-${agentId}-${tool.id}`,
      source: agentId,
      target: tool.id,
      style: { stroke: '#00b4d8', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#00b4d8' },
    });
  });

  // Connect agent → memory
  const firstAgentId = agents?.length ? `agent-${agents[0].id || 0}` : 'agent-demo';
  edges.push({
    id: 'e-agent-memory',
    source: firstAgentId,
    target: 'memory-brain',
    style: { stroke: '#4ecdc4', strokeWidth: 1.5, strokeDasharray: '5 3' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#4ecdc4' },
  });

  // Output nodes
  const outputs = [
    { id: 'output-obs', label: 'Observations', description: 'Captured to timeline', icon: '📊' },
    { id: 'output-deploy', label: 'Deploy', description: 'CI/CD pipeline', icon: '🚀' },
  ];

  outputs.forEach((out, i) => {
    nodes.push({
      id: out.id,
      type: 'output',
      position: { x: 920, y: 80 + i * 150 },
      data: { label: out.label, description: out.description, icon: out.icon },
    });

    // Connect tools → outputs
    edges.push({
      id: `e-tool-${out.id}`,
      source: tools[i]?.id || tools[0].id,
      target: out.id,
      style: { stroke: '#ff8c42', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#ff8c42' },
    });
  });

  // Connect memory → output (feedback loop)
  edges.push({
    id: 'e-memory-obs',
    source: 'memory-brain',
    sourceHandle: 'feedback',
    target: 'output-obs',
    style: { stroke: '#4ecdc4', strokeWidth: 1, strokeDasharray: '3 3' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#4ecdc4' },
  });

  return { nodes, edges };
}

// ── Main Component ──────────────────────────────────────────

export default function WorkflowCanvas({ agents, observations, workspaces, plan, onUpgrade }) {
  const workflow = useMemo(
    () => buildWorkflow(agents, observations, workspaces),
    [agents, observations, workspaces]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(workflow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow.edges);

  const proLocked = plan === 'free';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
        defaultEdgeOptions={{
          style: { strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
      >
        <Background
          variant="dots"
          gap={20}
          size={1}
          color="rgba(255,255,255,0.04)"
        />
        <Controls
          style={{
            background: 'rgba(26,26,46,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
          }}
        />
        <MiniMap
          style={{
            background: 'rgba(26,26,46,0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
          }}
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger': return '#9b59ff';
              case 'agent': return '#00b4d8';
              case 'tool': return '#ff8c42';
              case 'output': return '#00e68a';
              case 'memory': return '#4ecdc4';
              default: return '#666';
            }
          }}
          maskColor="rgba(0,0,0,0.7)"
        />
      </ReactFlow>

      {/* Legend */}
      <div style={{
        position: 'absolute', top: 12, left: 12, display: 'flex', gap: 10,
        padding: '6px 12px', background: 'rgba(26,26,46,0.9)', borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {[
          { color: '#9b59ff', label: 'Trigger' },
          { color: '#00b4d8', label: 'Agent' },
          { color: '#ff8c42', label: 'Tool' },
          { color: '#4ecdc4', label: 'Memory' },
          { color: '#00e68a', label: 'Output' },
        ].map(l => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      {/* Export button */}
      <button
        onClick={() => {
          const data = JSON.stringify({ nodes, edges }, null, 2);
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'agentos-workflow.json';
          a.click();
          URL.revokeObjectURL(url);
        }}
        style={{
          position: 'absolute', top: 12, right: 12,
          padding: '6px 14px', fontSize: 11, fontWeight: 700,
          background: 'rgba(26,26,46,0.9)', color: 'rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        Export JSON →
      </button>

      {/* Pro upsell for drag-and-drop editing */}
      {proLocked && (
        <div style={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 20px', background: 'rgba(26,26,46,0.95)',
          border: '1px solid rgba(155,89,255,0.2)', borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 12,
          backdropFilter: 'blur(12px)',
        }}>
          <span style={{ fontSize: 13 }}>🔒</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Pro: Interactive Workflow Builder</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
              Drag-and-drop · Custom nodes · Conditional branching · Workflow execution
            </div>
          </div>
          <button
            onClick={() => onUpgrade?.('pro')}
            style={{
              padding: '4px 12px', fontSize: 10, fontWeight: 800,
              background: 'rgba(155,89,255,0.2)', color: '#9b59ff',
              border: '1px solid rgba(155,89,255,0.3)', borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Upgrade
          </button>
        </div>
      )}
    </div>
  );
}
