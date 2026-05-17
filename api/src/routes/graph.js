import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase } from '../middleware/db.js';

const router = Router();
const API_VERSION = 'v1';

// ══════════════════════════════════════
// KNOWLEDGE GRAPH — Entity & Edge Data
// ══════════════════════════════════════

router.get(`/api/${API_VERSION}/graph`, authenticate, async (req, res) => {
  try {
    const orgId = req.org.id;

    // Fetch all sources in parallel
    const [agentRes, kiRes, edgeRes, spanRes, workspaceRes] = await Promise.all([
      supabase.from('agents').select('id, name, status, module, total_runs').eq('org_id', orgId),
      supabase.from('knowledge_items').select('id, name, summary').eq('org_id', orgId),
      supabase.from('knowledge_edges').select('source_entity, target_entity, relationship, weight').eq('org_id', orgId),
      supabase.from('spans').select('model, provider').eq('org_id', orgId),
      supabase.from('workspaces').select('id, name, stack').eq('org_id', orgId),
    ]);

    const nodes = [];
    const edges = [];
    const nodeIds = new Set();

    // Agent nodes
    (agentRes.data || []).forEach(a => {
      const id = `agent:${a.name}`;
      if (!nodeIds.has(id)) {
        nodeIds.add(id);
        nodes.push({
          id,
          label: a.name,
          type: 'agent',
          status: a.status,
          mentions: a.total_runs || 1,
        });
      }
    });

    // Model nodes (from spans)
    const modelCounts = {};
    (spanRes.data || []).forEach(sp => {
      const key = sp.model || 'unknown';
      modelCounts[key] = (modelCounts[key] || 0) + 1;
    });
    Object.entries(modelCounts).forEach(([model, count]) => {
      const id = `model:${model}`;
      if (!nodeIds.has(id)) {
        nodeIds.add(id);
        nodes.push({ id, label: model, type: 'model', mentions: count });
      }
    });

    // Knowledge item nodes
    (kiRes.data || []).forEach(ki => {
      const id = `entity:${ki.name}`;
      if (!nodeIds.has(id)) {
        nodeIds.add(id);
        nodes.push({ id, label: ki.name, type: 'entity', mentions: 1 });
      }
    });

    // Workspace nodes
    (workspaceRes.data || []).forEach(ws => {
      const id = `workspace:${ws.name}`;
      if (!nodeIds.has(id)) {
        nodeIds.add(id);
        nodes.push({ id, label: ws.name, type: 'workspace', mentions: 1 });
      }
    });

    // Knowledge edges
    (edgeRes.data || []).forEach(e => {
      // Ensure source and target nodes exist
      const sourceId = nodeIds.has(`entity:${e.source_entity}`) ? `entity:${e.source_entity}`
        : nodeIds.has(`agent:${e.source_entity}`) ? `agent:${e.source_entity}`
        : nodeIds.has(`model:${e.source_entity}`) ? `model:${e.source_entity}`
        : null;

      const targetId = nodeIds.has(`entity:${e.target_entity}`) ? `entity:${e.target_entity}`
        : nodeIds.has(`agent:${e.target_entity}`) ? `agent:${e.target_entity}`
        : nodeIds.has(`model:${e.target_entity}`) ? `model:${e.target_entity}`
        : null;

      if (sourceId && targetId) {
        edges.push({
          source: sourceId,
          target: targetId,
          relationship: e.relationship,
          weight: e.weight || 1,
        });
      }
    });

    // Auto-generate agent→model edges from trace data
    // Get traces with both agent and span model info
    const { data: traceData } = await supabase
      .from('traces')
      .select('agent')
      .eq('org_id', orgId)
      .not('agent', 'is', null);

    const agentModelLinks = {};
    if (traceData) {
      for (const tr of traceData) {
        if (tr.agent) {
          const agentId = `agent:${tr.agent}`;
          // Link to all models (simplified)
          Object.keys(modelCounts).forEach(model => {
            const key = `${agentId}->model:${model}`;
            agentModelLinks[key] = (agentModelLinks[key] || 0) + 1;
          });
        }
      }
    }
    Object.entries(agentModelLinks).forEach(([key, weight]) => {
      const [source, target] = key.split('->');
      if (nodeIds.has(source) && nodeIds.has(target)) {
        edges.push({ source, target, relationship: 'uses', weight });
      }
    });

    res.json({
      nodes,
      edges,
      node_count: nodes.length,
      edge_count: edges.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
