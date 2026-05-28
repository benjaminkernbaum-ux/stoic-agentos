/**
 * E2E Tests — Memory & Compliance API (v3 — synced with refactored routes)
 *
 * Tests the Three-Tier Memory and Compliance endpoints end-to-end.
 * Run: npx vitest run api/tests/e2e/memory-compliance.e2e.test.js
 */

import { describe, it, expect, afterAll } from 'vitest';

const API_KEY = process.env.AGENTOS_E2E_API_KEY || '';
const API_URL = process.env.AGENTOS_E2E_API_URL || 'https://stoic-agentos-api-production.up.railway.app/api/v1';

const describeE2E = API_KEY ? describe : describe.skip;

const cleanup = { tripleIds: [] };

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
    expect(data).toHaveProperty('working');
    expect(data).toHaveProperty('episodic');
    expect(data).toHaveProperty('semantic');
    expect(typeof data.working).toBe('number');
  });
});

// ─────────────────────────────────────────────
// Working Memory (Tier 1)
// ─────────────────────────────────────────────

describeE2E('Working Memory (Tier 1)', () => {
  const sessionId = `e2e-session-${Date.now()}`;
  let entryId;

  it('POST /memory/working stores a key-value pair', async () => {
    const res = await api('/memory/working', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        key: 'test_context',
        value: { model: 'gpt-4o', temperature: 0.7 },
        ttl_seconds: 300,
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.session_id).toBe(sessionId);
    expect(data.key).toBe('test_context');
    entryId = data.id;
  });

  it('POST /memory/working rejects missing session_id', async () => {
    const res = await api('/memory/working', {
      method: 'POST',
      body: JSON.stringify({ key: 'test', value: {} }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /memory/working retrieves entries', async () => {
    const res = await api(`/memory/working?session_id=${sessionId}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('DELETE /memory/working/:id removes entry', async () => {
    if (!entryId) return;
    const res = await api(`/memory/working/${entryId}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Episodic Memory (Tier 2)
// ─────────────────────────────────────────────

describeE2E('Episodic Memory (Tier 2)', () => {
  it('POST /memory/episodic stores an episode', async () => {
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
  });

  it('POST /memory/episodic rejects missing content', async () => {
    const res = await api('/memory/episodic', {
      method: 'POST',
      body: JSON.stringify({ event_type: 'note' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /memory/episodic lists episodes with filters', async () => {
    const res = await api('/memory/episodic?event_type=deployment');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /memory/episodic/timeline returns grouped days', async () => {
    const res = await api('/memory/episodic/timeline');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('days');
    expect(Array.isArray(data.days)).toBe(true);
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
        source_type: 'manual',
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.subject).toBe('e2e-test-agent');
    expect(data.relation).toBe('uses');
    expect(data.object).toBe('GPT-4o-mini');
    tripleId = data.id;
    cleanup.tripleIds.push(data.id);
  });

  it('GET /memory/semantic queries triples by subject', async () => {
    const res = await api('/memory/semantic?subject=e2e-test-agent');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('DELETE /memory/semantic/:id removes a triple', async () => {
    if (!tripleId) return;
    const res = await api(`/memory/semantic/${tripleId}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    cleanup.tripleIds = cleanup.tripleIds.filter(id => id !== tripleId);
  });
});

// ─────────────────────────────────────────────
// Compliance: Audit Log
// ─────────────────────────────────────────────

describeE2E('Compliance — Audit Log', () => {
  it('POST /compliance/audit-log creates an audit event', async () => {
    const res = await api('/compliance/audit-log', {
      method: 'POST',
      body: JSON.stringify({
        event_type: 'tool_call',
        action: 'e2e_test_action',
        reasoning: 'E2E test — immutable audit log',
        verdict: 'PROCEED',
        metadata: { e2e: true },
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.event_type).toBe('tool_call');
    expect(data.verdict).toBe('PROCEED');
  });

  it('POST /compliance/audit-log rejects missing fields', async () => {
    const res = await api('/compliance/audit-log', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('GET /compliance/audit-log queries events with filters', async () => {
    const res = await api('/compliance/audit-log?event_type=tool_call');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Compliance: Stats & Circuit Breaker
// ─────────────────────────────────────────────

describeE2E('Compliance — Stats & Circuit Breaker', () => {
  it('GET /compliance/audit-log/stats returns breakdown', async () => {
    const res = await api('/compliance/audit-log/stats');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('by_type');
    expect(data).toHaveProperty('by_verdict');
    expect(typeof data.total).toBe('number');
  });

  it('GET /compliance/circuit-breaker returns agent statuses', async () => {
    const res = await api('/compliance/circuit-breaker');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('circuit_status');
      expect(['open', 'half-open', 'closed']).toContain(data[0].circuit_status);
    }
  });

  it('GET /compliance/audit-log/export returns downloadable data', async () => {
    const res = await api('/compliance/audit-log/export');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
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
  console.log('🧹 Cleanup complete.\n');
});
