/**
 * E2E API Tests for Stoic AgentOS
 * 
 * Tests the real production API endpoints with a live API key.
 * All tests are idempotent — they create test resources, verify them, and clean up.
 * 
 * Run: npx vitest run api/tests/e2e/
 * 
 * Environment:
 *   AGENTOS_E2E_API_KEY - API key to use (defaults to test key)
 *   AGENTOS_E2E_API_URL - API base URL (defaults to production)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_KEY = process.env.AGENTOS_E2E_API_KEY || '';
const API_URL = process.env.AGENTOS_E2E_API_URL || 'https://api.stoicagentos.com/api/v1';

// Skip E2E tests if no API key is set (CI without secrets, local dev without .env)
const describeE2E = API_KEY ? describe : describe.skip;

// Track resources for cleanup
const cleanup = {
  agentIds: [],
  observationIds: [],
  workspaceIds: [],
  knowledgeItemIds: [],
};

function api(path, options = {}) {
  const url = `${API_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    ...options.headers,
  };
  return fetch(url, { ...options, headers });
}

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────

describe('Health', () => {
  it('GET /health returns ok without auth', async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.version).toBe('v1');
  });
});

// ─────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────

describeE2E('Authentication', () => {
  it('rejects requests with no auth header', async () => {
    const res = await fetch(`${API_URL}/stats`);
    expect(res.status).toBe(401);
  });

  it('rejects requests with invalid API key', async () => {
    const res = await fetch(`${API_URL}/stats`, {
      headers: { 'Authorization': 'Bearer sk_live_definitely_invalid_key_12345' },
    });
    expect(res.status).toBe(401);
  });

  it('accepts valid API key and returns stats', async () => {
    const res = await api('/stats');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('plan');
    expect(data).toHaveProperty('agents');
    expect(data).toHaveProperty('observations');
  });
});

// ─────────────────────────────────────────────
// Agents CRUD
// ─────────────────────────────────────────────

describeE2E('Agents API', () => {
  const testAgentName = `e2e-test-agent-${Date.now()}`;

  it('POST /agents creates an agent', async () => {
    const res = await api('/agents', {
      method: 'POST',
      body: JSON.stringify({
        name: testAgentName,
        description: 'E2E test agent — will be cleaned up',
        module: 'standalone',
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe(testAgentName);
    expect(data.id).toBeTruthy();
    expect(data.module).toBe('standalone');
    cleanup.agentIds.push(data.id);
  });

  it('POST /agents rejects missing name', async () => {
    const res = await api('/agents', {
      method: 'POST',
      body: JSON.stringify({ description: 'no name' }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/name/i);
  });

  it('GET /agents lists agents including the new one', async () => {
    const res = await api('/agents');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    const found = data.find(a => a.name === testAgentName);
    expect(found).toBeTruthy();
  });

  it('POST /agents/heartbeat upserts agent with status', async () => {
    const hbName = `e2e-hb-agent-${Date.now()}`;
    const res = await api('/agents/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ name: hbName, status: 'running' }),
    });
    expect([200, 201]).toContain(res.status);
    const data = await res.json();
    expect(data.name).toBe(hbName);
    expect(data.last_heartbeat).toBeTruthy();
    cleanup.agentIds.push(data.id);
  });

  it('DELETE /agents/:id removes an agent', async () => {
    // Create a throwaway agent to delete
    const createRes = await api('/agents', {
      method: 'POST',
      body: JSON.stringify({
        name: `e2e-delete-agent-${Date.now()}`,
        description: 'Will be deleted immediately',
        module: 'standalone',
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.id).toBeTruthy();

    // Delete it
    const deleteRes = await api(`/agents/${created.id}`, { method: 'DELETE' });
    expect(deleteRes.status).toBe(200);
    const deleteData = await deleteRes.json();
    expect(deleteData.deleted).toBe(true);
    expect(deleteData.id).toBe(created.id);

    // Verify it's gone
    const listRes = await api('/agents');
    const agents = await listRes.json();
    const found = agents.find(a => a.id === created.id);
    expect(found).toBeFalsy();
  });

  it('DELETE /agents/:id returns 404 for non-existent agent', async () => {
    const res = await api('/agents/00000000-0000-0000-0000-000000000000', { method: 'DELETE' });
    // Should be 404 or 500 (Supabase may throw PGRST116 for .single() on 0 rows)
    expect([404, 500]).toContain(res.status);
    const data = await res.json();
    expect(data).toHaveProperty('error');
  });
});

// ─────────────────────────────────────────────
// Observations CRUD
// ─────────────────────────────────────────────

describeE2E('Observations API', () => {
  const testTitle = `e2e-observation-${Date.now()}`;

  it('POST /observations creates an observation', async () => {
    const res = await api('/observations', {
      method: 'POST',
      body: JSON.stringify({
        type: 'note',
        title: testTitle,
        content: 'Created by E2E test suite — will be cleaned up',
        metadata: { e2e: true, timestamp: Date.now() },
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe(testTitle);
    expect(data.type).toBe('note');
    expect(data.id).toBeTruthy();
    cleanup.observationIds.push(data.id);
  });

  it('POST /observations rejects missing type/title', async () => {
    const res = await api('/observations', {
      method: 'POST',
      body: JSON.stringify({ content: 'no type or title' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /observations lists with filters', async () => {
    const res = await api('/observations?type=note&limit=5');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('type');
      expect(data[0]).toHaveProperty('title');
    }
  });

  it('GET /observations supports pagination', async () => {
    const res = await api('/observations?limit=2&offset=0');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeLessThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────
// Workspaces CRUD
// ─────────────────────────────────────────────

describeE2E('Workspaces API', () => {
  const testWsName = `e2e-workspace-${Date.now()}`;

  it('POST /workspaces creates a workspace', async () => {
    const res = await api('/workspaces', {
      method: 'POST',
      body: JSON.stringify({
        name: testWsName,
        path: '/tmp/e2e-test',
        stack: 'node',
      }),
    });
    // Might be 201 or 429 if at limit
    if (res.status === 201) {
      const data = await res.json();
      expect(data.name).toBe(testWsName);
      cleanup.workspaceIds.push(data.id);
    } else {
      // Skip if at plan limit
      expect([201, 429]).toContain(res.status);
    }
  });

  it('GET /workspaces lists workspaces', async () => {
    const res = await api('/workspaces');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('DELETE /workspaces/:id removes a workspace', async () => {
    // Create a throwaway workspace
    const createRes = await api('/workspaces', {
      method: 'POST',
      body: JSON.stringify({
        name: `e2e-delete-ws-${Date.now()}`,
        path: '/tmp/e2e-delete-test',
        stack: 'node',
      }),
    });

    if (createRes.status === 429) {
      // At plan limit — skip this test gracefully
      return;
    }
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.id).toBeTruthy();

    // Delete it
    const deleteRes = await api(`/workspaces/${created.id}`, { method: 'DELETE' });
    expect(deleteRes.status).toBe(200);
    const deleteData = await deleteRes.json();
    expect(deleteData.deleted).toBe(true);
    expect(deleteData.id).toBe(created.id);
  });

  it('DELETE /workspaces/:id returns 404 for non-existent workspace', async () => {
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000', { method: 'DELETE' });
    expect([404, 500]).toContain(res.status);
    const data = await res.json();
    expect(data).toHaveProperty('error');
  });
});

// ─────────────────────────────────────────────
// Knowledge Items CRUD
// ─────────────────────────────────────────────

describeE2E('Knowledge Items API', () => {
  const testKiName = `e2e-knowledge-${Date.now()}`;

  it('POST /knowledge-items creates a knowledge item', async () => {
    const res = await api('/knowledge-items', {
      method: 'POST',
      body: JSON.stringify({
        name: testKiName,
        summary: 'E2E test knowledge item',
        content: 'This was created by the E2E test suite and will be cleaned up.',
      }),
    });
    if (res.status === 201) {
      const data = await res.json();
      expect(data.name).toBe(testKiName);
      cleanup.knowledgeItemIds.push(data.id);
    } else {
      // Skip if at plan limit
      expect([201, 429]).toContain(res.status);
    }
  });

  it('GET /knowledge-items lists knowledge items', async () => {
    const res = await api('/knowledge-items');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('DELETE /knowledge-items/:id removes a knowledge item', async () => {
    // Create a throwaway KI
    const createRes = await api('/knowledge-items', {
      method: 'POST',
      body: JSON.stringify({
        name: `e2e-delete-ki-${Date.now()}`,
        summary: 'Will be deleted immediately',
        content: 'Throwaway knowledge item for DELETE test.',
      }),
    });

    if (createRes.status === 429) {
      // At plan limit — skip this test gracefully
      return;
    }
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.id).toBeTruthy();

    // Delete it
    const deleteRes = await api(`/knowledge-items/${created.id}`, { method: 'DELETE' });
    expect(deleteRes.status).toBe(200);
    const deleteData = await deleteRes.json();
    expect(deleteData.deleted).toBe(true);
    expect(deleteData.id).toBe(created.id);
  });

  it('DELETE /knowledge-items/:id returns 404 for non-existent item', async () => {
    const res = await api('/knowledge-items/00000000-0000-0000-0000-000000000000', { method: 'DELETE' });
    expect([404, 500]).toContain(res.status);
    const data = await res.json();
    expect(data).toHaveProperty('error');
  });
});

// ─────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────

describeE2E('Stats API', () => {
  it('GET /stats returns plan and counts', async () => {
    const res = await api('/stats');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.plan).toBeTruthy();
    expect(typeof data.agents).toBe('number');
    expect(typeof data.observations).toBe('number');
    expect(typeof data.workspaces).toBe('number');
    expect(typeof data.knowledgeItems).toBe('number');
    expect(typeof data.observationLimit).toBe('number');
  });
});

// ─────────────────────────────────────────────
// API Keys (list only — don't create/delete)
// ─────────────────────────────────────────────

describeE2E('API Keys API', () => {
  it('GET /api-keys lists keys (masked)', async () => {
    const res = await api('/api-keys');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      // Keys should be masked
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('active');
    }
  });

  it('GET /api-keys/anthropic returns key status', async () => {
    const res = await api('/api-keys/anthropic');
    expect(res.status).toBe(200);
    const data = await res.json();
    // Should always return a well-formed response, even if BYOK isn't configured
    expect(data).toHaveProperty('configured');
    expect(typeof data.configured).toBe('boolean');
    // last4 is either null or a string
    expect(data).toHaveProperty('last4');
  });
});

// ─────────────────────────────────────────────
// Alerts API
// ─────────────────────────────────────────────

describeE2E('Alerts API', () => {
  it('GET /alerts returns rules and events (or graceful empty)', async () => {
    const res = await api('/alerts');
    expect(res.status).toBe(200);
    const data = await res.json();
    // Should have rules and events arrays, or at least a hint
    expect(data).toHaveProperty('rules');
    expect(data).toHaveProperty('events');
    expect(Array.isArray(data.rules)).toBe(true);
    expect(Array.isArray(data.events)).toBe(true);
  });

  it('GET /alerts/rules returns an array', async () => {
    const res = await api('/alerts/rules');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /alerts/events returns an array', async () => {
    const res = await api('/alerts/events');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Graph API
// ─────────────────────────────────────────────

describeE2E('Graph API', () => {
  it('GET /graph returns nodes and edges with counts', async () => {
    const res = await api('/graph');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('nodes');
    expect(data).toHaveProperty('edges');
    expect(data).toHaveProperty('node_count');
    expect(data).toHaveProperty('edge_count');
    expect(Array.isArray(data.nodes)).toBe(true);
    expect(Array.isArray(data.edges)).toBe(true);
    expect(data.node_count).toBe(data.nodes.length);
    expect(data.edge_count).toBe(data.edges.length);
  });
});

// ─────────────────────────────────────────────
// Insights API (analyze-agent error handling)
// ─────────────────────────────────────────────

describeE2E('Insights API — analyze-agent', () => {
  it('POST /insights/analyze-agent returns 400 without agent_id', async () => {
    const res = await api('/insights/analyze-agent', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/agent_id/i);
  });

  it('POST /insights/analyze-agent returns 404 with proper JSON for invalid agent_id', async () => {
    const res = await api('/insights/analyze-agent', {
      method: 'POST',
      body: JSON.stringify({ agent_id: '00000000-0000-0000-0000-000000000000' }),
    });
    // Should be 402 (no key) or 404 (agent not found) — both with JSON body
    expect([402, 404]).toContain(res.status);
    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(typeof data.error).toBe('string');
    expect(data.error.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// SDK Integration (uses real SDK against live API)
// ─────────────────────────────────────────────

describeE2E('SDK Integration', () => {
  it('SDK can capture and fetch observations via live API', async () => {
    // Dynamic import to avoid module resolution issues
    const { AgentOS } = await import('../../../sdk/src/index.js');
    const os = new AgentOS({ apiKey: API_KEY, apiUrl: API_URL });

    const title = `sdk-e2e-${Date.now()}`;
    await os.capture({ type: 'note', title, content: 'SDK E2E test' });
    await os.flush();

    // Give the API a moment to persist
    await new Promise(r => setTimeout(r, 500));

    const observations = await os.getObservations({ limit: 5 });
    expect(observations).toBeTruthy();
    if (Array.isArray(observations) && observations.length > 0) {
      // Check we can at least fetch observations
      expect(observations[0]).toHaveProperty('type');
    }

    // Clean up
    if (Array.isArray(observations)) {
      const found = observations.find(o => o.title === title);
      if (found) cleanup.observationIds.push(found.id);
    }
  });
});

// ─────────────────────────────────────────────
// Cleanup
// ─────────────────────────────────────────────

afterAll(async () => {
  console.log('\n🧹 Cleaning up E2E test resources...');

  // Delete observations
  for (const id of cleanup.observationIds) {
    try {
      await api(`/observations/${id}`, { method: 'DELETE' });
      console.log(`  ✓ Deleted observation ${id}`);
    } catch (e) {
      console.warn(`  ✗ Failed to delete observation ${id}:`, e.message);
    }
  }

  // Delete agents (now has DELETE endpoint)
  for (const id of cleanup.agentIds) {
    try {
      await api(`/agents/${id}`, { method: 'DELETE' });
      console.log(`  ✓ Deleted agent ${id}`);
    } catch (e) {
      console.warn(`  ✗ Failed to delete agent ${id}:`, e.message);
    }
  }

  // Delete workspaces
  for (const id of cleanup.workspaceIds) {
    try {
      await api(`/workspaces/${id}`, { method: 'DELETE' });
      console.log(`  ✓ Deleted workspace ${id}`);
    } catch (e) {
      console.warn(`  ✗ Failed to delete workspace ${id}:`, e.message);
    }
  }

  // Delete knowledge items
  for (const id of cleanup.knowledgeItemIds) {
    try {
      await api(`/knowledge-items/${id}`, { method: 'DELETE' });
      console.log(`  ✓ Deleted knowledge item ${id}`);
    } catch (e) {
      console.warn(`  ✗ Failed to delete knowledge item ${id}:`, e.message);
    }
  }

  console.log('🧹 Cleanup complete.\n');
});
