import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';

const router = Router();
const API_VERSION = 'v1';

/**
 * Helper: check if a Supabase error means the table doesn't exist.
 */
function isTableMissing(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    (msg.includes('relation') && msg.includes('does not exist')) ||
    msg.includes('could not find') ||
    error.code === '42P01'
  );
}

// ══════════════════════════════════════
// KNOWLEDGE GRAPH — Entity & Edge Data
// ══════════════════════════════════════

router.get(`/api/${API_VERSION}/graph`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.org.id;

    // Fetch all sources in parallel — some tables may not exist yet
    const [agentRes, kiRes, workspaceRes, observationRes] = await Promise.all([
      supabase!.from('agents').select('id, name, status, module, total_runs').eq('org_id', orgId),
      supabase!.from('knowledge_items').select('id, name, summary').eq('org_id', orgId),
      supabase!.from('workspaces').select('id, name, stack').eq('org_id', orgId),
      supabase!.from('observations').select('id, agent_id, workspace_id, type, title').eq('org_id', orgId).order('created_at', { ascending: false }).limit(500),
    ]);

    // Optionally fetch knowledge_edges and spans — these tables may not exist
    let edgeData: Array<Record<string, unknown>> = [];
    let spanData: Array<Record<string, unknown>> = [];

    const edgeRes = await supabase!.from('knowledge_edges').select('source_entity, target_entity, relationship, weight').eq('org_id', orgId);
    if (!isTableMissing(edgeRes.error)) {
      edgeData = edgeRes.data || [];
    }

    const spanRes = await supabase!.from('spans').select('model, provider').eq('org_id', orgId);
    if (!isTableMissing(spanRes.error)) {
      spanData = spanRes.data || [];
    }

    const nodes: Array<Record<string, unknown>> = [];
    const edges: Array<Record<string, unknown>> = [];
    const nodeIds = new Set<string>();

    // ── Build lookup maps for edge generation ──
    const agentIdToName = new Map<string, string>();
    const workspaceIdToName = new Map<string, string>();

    // Agent nodes
    (agentRes.data || []).forEach((a: Record<string, unknown>) => {
      const id = `agent:${a.name}`;
      agentIdToName.set(a.id as string, a.name as string);
      if (!nodeIds.has(id)) {
        nodeIds.add(id);
        nodes.push({
          id,
          label: a.name,
          type: 'agent',
          status: a.status,
          mentions: (a.total_runs as number) || 1,
        });
      }
    });

    // Workspace nodes
    (workspaceRes.data || []).forEach((ws: Record<string, unknown>) => {
      const id = `workspace:${ws.name}`;
      workspaceIdToName.set(ws.id as string, ws.name as string);
      if (!nodeIds.has(id)) {
        nodeIds.add(id);
        nodes.push({ id, label: ws.name, type: 'workspace', mentions: 1 });
      }
    });

    // Model nodes (from spans)
    const modelCounts: Record<string, number> = {};
    spanData.forEach((sp: Record<string, unknown>) => {
      const key = (sp.model as string) || 'unknown';
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
    (kiRes.data || []).forEach((ki: Record<string, unknown>) => {
      const id = `entity:${ki.name}`;
      if (!nodeIds.has(id)) {
        nodeIds.add(id);
        nodes.push({ id, label: ki.name, type: 'entity', mentions: 1 });
      }
    });

    // ══════════════════════════════════════
    // EDGE GENERATION
    // ══════════════════════════════════════

    const edgeDedup = new Set<string>();

    function addEdge(source: string, target: string, relationship: string, weight: number = 1): void {
      if (!nodeIds.has(source) || !nodeIds.has(target)) return;
      if (source === target) return;
      const key = `${source}|${target}|${relationship}`;
      if (edgeDedup.has(key)) return;
      edgeDedup.add(key);
      edges.push({ source, target, relationship, weight });
    }

    // 1. Knowledge edges from the knowledge_edges table
    edgeData.forEach((e: Record<string, unknown>) => {
      const sourceId = nodeIds.has(`entity:${e.source_entity}`) ? `entity:${e.source_entity}`
        : nodeIds.has(`agent:${e.source_entity}`) ? `agent:${e.source_entity}`
        : nodeIds.has(`model:${e.source_entity}`) ? `model:${e.source_entity}`
        : null;

      const targetId = nodeIds.has(`entity:${e.target_entity}`) ? `entity:${e.target_entity}`
        : nodeIds.has(`agent:${e.target_entity}`) ? `agent:${e.target_entity}`
        : nodeIds.has(`model:${e.target_entity}`) ? `model:${e.target_entity}`
        : null;

      if (sourceId && targetId) {
        addEdge(sourceId, targetId, e.relationship as string, (e.weight as number) || 1);
      }
    });

    // 2. Agent → Workspace edges (agents that have observations in a workspace)
    const agentWorkspaceCounts: Record<string, number> = {};
    const observations = observationRes.data || [];
    for (const obs of observations) {
      const agentName = agentIdToName.get(obs.agent_id);
      const wsName = workspaceIdToName.get(obs.workspace_id);
      if (agentName && wsName) {
        const key = `agent:${agentName}|workspace:${wsName}`;
        agentWorkspaceCounts[key] = (agentWorkspaceCounts[key] || 0) + 1;
      }
    }
    for (const [key, count] of Object.entries(agentWorkspaceCounts)) {
      const [source, target] = key.split('|');
      addEdge(source, target, 'works_in', count);
    }

    // 3. Agent → Observation Type edges (which types of observations each agent generates)
    const agentTypeCounts: Record<string, number> = {};
    for (const obs of observations) {
      const agentName = agentIdToName.get(obs.agent_id);
      if (agentName && obs.type) {
        const key = `${agentName}|${obs.type}`;
        agentTypeCounts[key] = (agentTypeCounts[key] || 0) + 1;
      }
    }

    // Create observation-type nodes for types that have > 2 observations
    const typeNodeThreshold = 2;
    const typeCounts: Record<string, number> = {};
    for (const obs of observations) {
      if (obs.type) {
        typeCounts[obs.type] = (typeCounts[obs.type] || 0) + 1;
      }
    }
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > typeNodeThreshold) {
        const id = `type:${type}`;
        if (!nodeIds.has(id)) {
          nodeIds.add(id);
          nodes.push({ id, label: type, type: 'observation_type', mentions: count });
        }
      }
    }

    for (const [key, count] of Object.entries(agentTypeCounts)) {
      const [agentName, type] = key.split('|');
      if (count > typeNodeThreshold) {
        addEdge(`agent:${agentName}`, `type:${type}`, 'generates', count);
      }
    }

    // 4. Entity co-occurrence: entities mentioned in the same observation title
    // Match knowledge item names against observation titles
    const kiNames = (kiRes.data || []).map((ki: Record<string, unknown>) => ki.name as string);
    if (kiNames.length > 1) {
      for (const obs of observations) {
        const title = (obs.title || '').toLowerCase();
        const mentioned = kiNames.filter(name => title.includes(name.toLowerCase()));
        // Create co-occurrence edges between all pairs
        for (let i = 0; i < mentioned.length; i++) {
          for (let j = i + 1; j < mentioned.length; j++) {
            addEdge(`entity:${mentioned[i]}`, `entity:${mentioned[j]}`, 'co_occurs', 1);
          }
          // Also link the entity to the agent that produced this observation
          const agentName = agentIdToName.get(obs.agent_id);
          if (agentName) {
            addEdge(`agent:${agentName}`, `entity:${mentioned[i]}`, 'observed', 1);
          }
        }
      }
    }

    // 5. Agent→Model edges from trace data (optional — table may not exist)
    try {
      const { data: traceData, error: traceErr } = await supabase!
        .from('traces')
        .select('agent')
        .eq('org_id', orgId)
        .not('agent', 'is', null);

      if (!traceErr && traceData) {
        const agentModelLinks: Record<string, number> = {};
        for (const tr of traceData) {
          if (tr.agent) {
            const agentId = `agent:${tr.agent}`;
            Object.keys(modelCounts).forEach(model => {
              const lk = `${agentId}->model:${model}`;
              agentModelLinks[lk] = (agentModelLinks[lk] || 0) + 1;
            });
          }
        }
        for (const [lk, weight] of Object.entries(agentModelLinks)) {
          const [source, target] = lk.split('->');
          addEdge(source, target, 'uses', weight);
        }
      }
    } catch {
      // traces table may not exist — non-critical
    }

    // 6. If no edges were generated, create at least workspace-agent inferred links
    //    by connecting all agents to all workspaces (lightweight fallback)
    if (edges.length === 0 && agentRes.data?.length && workspaceRes.data?.length) {
      for (const a of agentRes.data) {
        for (const ws of workspaceRes.data) {
          addEdge(`agent:${a.name}`, `workspace:${ws.name}`, 'belongs_to', 1);
        }
      }
    }

    res.json({
      nodes,
      edges,
      node_count: nodes.length,
      edge_count: edges.length,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
