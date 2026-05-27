/**
 * E2E Tests — Memory & Compliance API
 *
 * Tests the Three-Tier Memory and Compliance endpoints end-to-end.
 * Run: npx vitest run api/tests/e2e/memory-compliance.e2e.test.js
 */

import { describe, it, expect, afterAll } from 'vitest';

const API_KEY = process.env.AGENTOS_E2E_API_KEY || '';
const API_URL = process.env.AGENTOS_E2E_API_URL || 'https://stoic-agentos-api-production.up.railway.app/api/v1';

const describeE2E = API_KEY ? describe : describe.skip;

const cleanup = {
  workingKeys: [],
  episodeIds: [],
  tripleIds: [],
};

function api(path, options = {}) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      ...options.headers,
    },
  });
}

// ─────────────────────────────────────────────
// Memory Stats
// ─────────────────────────────────────────────

describeE2E('Memory Stats', () => {
  it('GET /memory/stats returns tier counts', async () => {
    const res = await api('/memory/stats');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('working_memory');
    expect(data).toHaveProperty('episodic_memory');
    expect(data).toHaveProperty('semantic_memory');
    expect(data).toHaveProperty('total');
    expect(typeof data.total).toBe('number');
  });
});

// ─────────────────────────────────────────────
// Working Memory (Tier 1)
// ─────────────────────────────────────────────

describeE2E('Working Memory (Tier 1)', () => {
  const sessionId = `e2e-session-${Date.now()}`;

  it('POST /memory/working stores a key-value pair', async () => {
    const res = await api('/memory/working', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        key: 'test_context',
        value: { model: 'gpt-4o', temperature: 0.7 },
        expires_in_seconds: 300,
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.session_id).toBe(sessionId);
    expect(data.key).toBe('test_context');
    expect(data.value.model).toBe('gpt-4o');
    cleanup.workingKeys.push({ session_id: sessionId });
  });

  it('POST /memory/working rejects missing session_id', async () => {
    const res = await api('/memory/working', {
      method: 'POST',
      body: JSON.stringify({ key: 'test', value: {} }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/session_id/i);
  });

  it('GET /memory/working retrieves session state', async () => {
    const res = await api(`/memory/working?session_id=${sessionId}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    const entry = data.find(d => d.key === 'test_context');
    expect(entry).toBeTruthy();
    expect(entry.value.model).toBe('gpt-4o');
  });

  it('DELETE /memory/working clears session', async () => {
    const res = await api(`/memory/working?session_id=${sessionId}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Episodic Memory (Tier 2)
// ─────────────────────────────────────────────

describeE2E('Episodic Memory (Tier 2)', () => {
  let episodeId;

  it('POST /memory/episodic stores an episode with embedding', async () => {
    const res = await api('/memory/episodic', {
      method: 'POST',
      body: JSON.stringify({
        content: 'E2E test: deployed email-agent v3.2 to Railway with GPT-4o',
        event_type: 'deployment',
        importance: 8,
        metadata: { e2e: true, agent: 'email-agent', version: '3.2' },
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.content).toContain('email-agent');
    expect(data.event_type).toBe('deployment');
    expect(data.importance).toBe(8);
    expect(data.id).toBeTruthy();
    episodeId = data.id;
    cleanup.episodeIds.push(data.id);
  });

  it('POST /memory/episodic rejects missing content', async () => {
    const res = await api('/memory/episodic', {
      method: 'POST',
      body: JSON.stringify({ event_type: 'note' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /memory/episodic lists episodes with filters', async () => {
    const res = await api('/memory/episodic?event_type=deployment&limit=5');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('PATCH /memory/episodic/:id/invalidate marks episode expired', async () => {
    if (!episodeId) return;
    const res = await api(`/memory/episodic/${episodeId}/invalidate`, { method: 'PATCH' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.valid_to).toBeTruthy();
  });
});

// ─────────────────────────────────────────────
// Semantic Memory (Tier 3)
// ─────────────────────────────────────────────

describeE2E('Semantic Memory (Tier 3)', () => {
  let tripleId;

  it('POST /memory/semantic stores a knowledge triple', async () => {
    const res = await api('/memory/semantic', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'e2e-test-agent',
        relation: 'uses',
        object: 'GPT-4o-mini',
        confidence: 0.85,
        source_type: 'observation',
      }),
    });
    expect([200, 201]).toContain(res.status);
    const data = await res.json();
    expect(data.subject).toBe('e2e-test-agent');
    expect(data.relation).toBe('uses');
    expect(data.object).toBe('GPT-4o-mini');
    expect(['created', 'strengthened']).toContain(data.action);
    tripleId = data.id;
    cleanup.tripleIds.push(data.id);
  });

  it('POST /memory/semantic strengthens existing triple', async () => {
    const res = await api('/memory/semantic', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'e2e-test-agent',
        relation: 'uses',
        object: 'GPT-4o-mini',
        confidence: 0.95,
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.action).toBe('strengthened');
  });

  it('GET /memory/semantic queries triples', async () => {
    const res = await api('/memory/semantic?subject=e2e-test-agent&limit=5');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    const found = data.find(t => t.subject === 'e2e-test-agent');
    expect(found).toBeTruthy();
  });

  it('DELETE /memory/semantic/:id removes a triple', async () => {
    if (!tripleId) return;
    const res = await api(`/memory/semantic/${tripleId}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    // Remove from cleanup since we already deleted
    cleanup.tripleIds = cleanup.tripleIds.filter(id => id !== tripleId);
  });
});

// ─────────────────────────────────────────────
// Hybrid Recall
// ─────────────────────────────────────────────

describeE2E('Hybrid Recall', () => {
  it('POST /memory/recall performs quick search', async () => {
    const res = await api('/memory/recall', {
      method: 'POST',
      body: JSON.stringify({ query: 'deployment', mode: 'quick' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.mode).toBe('quick');
    expect(data).toHaveProperty('working');
    expect(data).toHaveProperty('semantic');
    expect(typeof data.total).toBe('number');
  });

  it('POST /memory/recall performs standard search', async () => {
    const res = await api('/memory/recall', {
      method: 'POST',
      body: JSON.stringify({ query: 'agent', mode: 'standard', temporal_window: '7d' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.mode).toBe('standard');
    expect(data).toHaveProperty('episodic');
  });

  it('POST /memory/recall performs deep search', async () => {
    const res = await api('/memory/recall', {
      method: 'POST',
      body: JSON.stringify({ query: 'Railway deployment', mode: 'deep' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.mode).toBe('deep');
  });

  it('POST /memory/recall rejects missing query', async () => {
    const res = await api('/memory/recall', {
      method: 'POST',
      body: JSON.stringify({ mode: 'quick' }),
    });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// Compliance: Audit Log
// ─────────────────────────────────────────────

describeE2E('Compliance — Audit Log', () => {
  it('POST /audit/log creates an immutable event', async () => {
    const res = await api('/audit/log', {
      method: 'POST',
      body: JSON.stringify({
        event_type: 'tool_call',
        action: 'e2e_test_action',
        reasoning: 'E2E test — will remain in audit log (immutable)',
        verdict: 'PROCEED',
        metadata: { e2e: true },
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.event_type).toBe('tool_call');
    expect(data.verdict).toBe('PROCEED');
    expect(data.context_hash).toBeTruthy(); // SHA-256 hash
  });

  it('POST /audit/log/batch logs multiple events', async () => {
    const res = await api('/audit/log/batch', {
      method: 'POST',
      body: JSON.stringify({
        events: [
          { event_type: 'decision', action: 'e2e_batch_1', verdict: 'PROCEED' },
          { event_type: 'decision', action: 'e2e_batch_2', verdict: 'MONITOR' },
        ],
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.inserted).toBe(2);
  });

  it('GET /audit/log queries events with filters', async () => {
    const res = await api('/audit/log?event_type=tool_call&limit=5');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Compliance: Stats & Circuit Breaker
// ─────────────────────────────────────────────

describeE2E('Compliance — Stats & Circuit Breaker', () => {
  it('GET /compliance/stats returns metrics', async () => {
    const res = await api('/compliance/stats');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('total_events');
    expect(typeof data.total_events).toBe('number');
  });

  it('POST /compliance/circuit-breaker rejects missing action', async () => {
    const res = await api('/compliance/circuit-breaker', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    // Should be 400 (validation) or accept with an error
    expect([400, 500]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────
// Memory Decay
// ─────────────────────────────────────────────

describeE2E('Memory Decay', () => {
  it('POST /memory/decay cleans up expired memory', async () => {
    const res = await api('/memory/decay', {
      method: 'POST',
      body: JSON.stringify({ max_age_hours: 72 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(typeof data.expired_removed).toBe('number');
    expect(typeof data.stale_removed).toBe('number');
  });
});

// ─────────────────────────────────────────────
// Cleanup
// ─────────────────────────────────────────────

afterAll(async () => {
  console.log('\n🧹 Cleaning up memory/compliance E2E resources...');

  for (const id of cleanup.tripleIds) {
    try {
      await api(`/memory/semantic/${id}`, { method: 'DELETE' });
      console.log(`  ✓ Deleted triple ${id}`);
    } catch (e) {
      console.warn(`  ✗ Failed to delete triple:`, e.message);
    }
  }

  // Episodic memory is immutable by design — we invalidated it in tests
  // Working memory was cleared in tests

  console.log('🧹 Memory/Compliance cleanup complete.\n');
});
