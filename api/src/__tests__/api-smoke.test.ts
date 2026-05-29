/**
 * ══════════════════════════════════════════════════════════════
 *  Stoic AgentOS — API Smoke Test Suite
 * ══════════════════════════════════════════════════════════════
 *
 *  Black-box tests against a running API server.
 *  No application code is imported — all verification is done
 *  via HTTP requests with native `fetch` (Node 18+).
 *
 *  Environment variables:
 *    TEST_API_URL    — API base URL  (default: http://localhost:4444)
 *    TEST_AUTH_TOKEN — Supabase Bearer token or sk_live_ API key.
 *                     If missing, auth-required groups are skipped.
 *
 *  Run:
 *    cd api && npx vitest run src/__tests__/api-smoke.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// ── Configuration ────────────────────────────────────────────
const BASE_URL = (process.env.TEST_API_URL || 'http://localhost:4444').replace(/\/+$/, '');
const TOKEN = process.env.TEST_AUTH_TOKEN || '';

// ── Helpers ──────────────────────────────────────────────────

/** Fetch helper — prepends BASE_URL and optionally attaches auth. */
export function api(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<Response> {
  const { auth = false, headers: extraHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };
  if (auth && TOKEN) {
    headers['Authorization'] = `Bearer ${TOKEN}`;
  }
  return fetch(`${BASE_URL}${path}`, { headers, ...rest });
}

/** Shorthand for authenticated requests. */
function authed(path: string, options: RequestInit = {}): Promise<Response> {
  return api(path, { ...options, auth: true });
}

// ── Summary tracking ────────────────────────────────────────
const summary: { group: string; status: 'ran' | 'skipped' }[] = [];

function trackGroup(name: string, ran: boolean): void {
  summary.push({ group: name, status: ran ? 'ran' : 'skipped' });
}

// ═══════════════════════════════════════════════════════════════
//  Pre-flight: verify API is reachable
// ═══════════════════════════════════════════════════════════════

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Health returned ${res.status}`);
  } catch (err) {
    throw new Error(
      `\n\n🚫  API not reachable at ${BASE_URL}/health\n` +
      `   Start the server first:  cd api && npm run dev\n` +
      `   Or set TEST_API_URL to the correct base URL.\n\n` +
      `   Error: ${(err as Error).message}\n`,
    );
  }
  console.log(`\n🔗  Smoke-testing API at ${BASE_URL}`);
  console.log(`🔑  Auth token: ${TOKEN ? '✅ provided' : '⚠️  not set — auth groups will be skipped'}\n`);
});

// ═══════════════════════════════════════════════════════════════
//  Group 1 — Health & Liveness (no auth needed)
// ═══════════════════════════════════════════════════════════════

describe('Group 1: Health & Liveness', () => {
  trackGroup('Health & Liveness', true);

  it('GET /health → 200 with status ok and db flag', async () => {
    const res = await api('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('db');
    expect(typeof body.db).toBe('boolean');
  });

  it('GET /api/v1/health → 200 with version', async () => {
    const res = await api('/api/v1/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('version', 'v1');
  });

  it('GET /api/v1/health/ready → 200 or 503 with checks object', async () => {
    const res = await api('/api/v1/health/ready');
    expect([200, 503]).toContain(res.status);
    const body = await res.json();
    expect(body).toHaveProperty('checks');
    expect(typeof body.checks).toBe('object');
    expect(body.checks).not.toBeNull();
    // Should contain at least a supabase check
    expect(body.checks).toHaveProperty('supabase');
  });

  it('GET /api/v1/health/metrics → 200', async () => {
    const res = await api('/api/v1/health/metrics');
    expect(res.status).toBe(200);
    const body = await res.json();
    // Metrics snapshot is an object — just verify it's parseable
    expect(body).toBeDefined();
    expect(typeof body).toBe('object');
  });
});

// ═══════════════════════════════════════════════════════════════
//  Group 2 — Auth Guard (no token → 401)
// ═══════════════════════════════════════════════════════════════

describe('Group 2: Auth Guard (unauthenticated → 401)', () => {
  trackGroup('Auth Guard', true);

  it('GET /api/v1/agents without token → 401', async () => {
    const res = await api('/api/v1/agents');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('GET /api/v1/observations without token → 401', async () => {
    const res = await api('/api/v1/observations');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/chat without token → 401', async () => {
    const res = await api('/api/v1/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'test' }),
    });
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/chat/suggestions without token → 401', async () => {
    const res = await api('/api/v1/chat/suggestions');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/stats without token → 401', async () => {
    const res = await api('/api/v1/stats');
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════
//  Group 3 — Authenticated Endpoints (skip if no token)
// ═══════════════════════════════════════════════════════════════

describe.skipIf(!TOKEN)('Group 3: Authenticated Endpoints', () => {
  trackGroup('Authenticated Endpoints', !!TOKEN);

  it('GET /api/v1/agents → 200 with array', async () => {
    const res = await authed('/api/v1/agents');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('GET /api/v1/observations → 200', async () => {
    const res = await authed('/api/v1/observations');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('GET /api/v1/stats → 200 with plan info', async () => {
    const res = await authed('/api/v1/stats');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('plan');
    expect(body).toHaveProperty('agents');
    expect(body).toHaveProperty('observations');
  });

  it('GET /api/v1/knowledge-items → 200', async () => {
    const res = await authed('/api/v1/knowledge-items');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('GET /api/v1/workspaces → 200', async () => {
    const res = await authed('/api/v1/workspaces');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('GET /api/v1/chat/suggestions?mode=stoic → 200 with suggestions', async () => {
    const res = await authed('/api/v1/chat/suggestions?mode=stoic');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('suggestions');
    expect(Array.isArray(body.suggestions)).toBe(true);
  });

  it('GET /api/v1/chat/suggestions?mode=architect → 200 with different suggestions', async () => {
    // Fetch stoic first for comparison
    const stoicRes = await authed('/api/v1/chat/suggestions?mode=stoic');
    const stoicBody = await stoicRes.json();

    const archRes = await authed('/api/v1/chat/suggestions?mode=architect');
    expect(archRes.status).toBe(200);
    const archBody = await archRes.json();
    expect(archBody).toHaveProperty('suggestions');
    expect(Array.isArray(archBody.suggestions)).toBe(true);

    // Architect suggestions should differ from stoic
    if (stoicBody.suggestions?.length && archBody.suggestions?.length) {
      const stoicFirst = JSON.stringify(stoicBody.suggestions[0]);
      const archFirst = JSON.stringify(archBody.suggestions[0]);
      expect(archFirst).not.toBe(stoicFirst);
    }
  });

  it('GET /api/v1/chat/history → 200 with conversations', async () => {
    const res = await authed('/api/v1/chat/history');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('conversations');
    expect(Array.isArray(body.conversations)).toBe(true);
  });

  it('GET /api/v1/insights/usage?days=7 → 200', async () => {
    const res = await authed('/api/v1/insights/usage?days=7');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
    expect(typeof body).toBe('object');
  });

  it('GET /api/v1/alerts → 200 with rules and events', async () => {
    const res = await authed('/api/v1/alerts');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('rules');
    expect(body).toHaveProperty('events');
  });

  it('GET /api/v1/graph → 200 with nodes and edges', async () => {
    const res = await authed('/api/v1/graph');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('nodes');
    expect(body).toHaveProperty('edges');
    expect(body).toHaveProperty('node_count');
    expect(body).toHaveProperty('edge_count');
    expect(Array.isArray(body.nodes)).toBe(true);
    expect(Array.isArray(body.edges)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
//  Group 4 — API Key Management (skip if no token)
// ═══════════════════════════════════════════════════════════════

describe.skipIf(!TOKEN)('Group 4: API Key Management', () => {
  trackGroup('API Key Management', !!TOKEN);

  it('GET /api/v1/api-keys → 200 with array', async () => {
    const res = await authed('/api/v1/api-keys');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
//  Group 5 — Input Validation
// ═══════════════════════════════════════════════════════════════

describe('Group 5: Input Validation', () => {
  trackGroup('Input Validation', true);

  it('POST /api/v1/chat with empty body → 400 or 401', async () => {
    // Without auth this returns 401; with auth and empty body it's 400.
    // Both are acceptable — the point is it doesn't return 200/500.
    const res = await api('/api/v1/chat', {
      method: 'POST',
      body: JSON.stringify({}),
      auth: TOKEN ? true : false,
    });
    expect([400, 401]).toContain(res.status);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('POST /api/v1/chat/stream with empty body → 400 or 401', async () => {
    const res = await api('/api/v1/chat/stream', {
      method: 'POST',
      body: JSON.stringify({}),
      auth: TOKEN ? true : false,
    });
    expect([400, 401]).toContain(res.status);
  });

  it('POST /api/v1/observations with empty body → 400 or 401', async () => {
    const res = await api('/api/v1/observations', {
      method: 'POST',
      body: JSON.stringify({}),
      auth: TOKEN ? true : false,
    });
    expect([400, 401]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════
//  Group 6 — 404 Handling
// ═══════════════════════════════════════════════════════════════

describe('Group 6: 404 Handling', () => {
  trackGroup('404 Handling', true);

  it('GET /api/v1/nonexistent → 404', async () => {
    const res = await api('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body.code).toBe('NOT_FOUND');
  });

  it('GET /does-not-exist → 404', async () => {
    const res = await api('/does-not-exist');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ═══════════════════════════════════════════════════════════════
//  Group 7 — CORS
// ═══════════════════════════════════════════════════════════════

describe('Group 7: CORS Headers', () => {
  trackGroup('CORS Headers', true);

  it('Request with Origin: https://stoicagentos.com → has access-control-allow-origin', async () => {
    const res = await fetch(`${BASE_URL}/health`, {
      headers: { Origin: 'https://stoicagentos.com' },
    });
    expect(res.status).toBe(200);
    const acao = res.headers.get('access-control-allow-origin');
    expect(acao).toBeTruthy();
    // Should echo back the allowed origin or be '*'
    expect(['https://stoicagentos.com', '*']).toContain(acao);
  });

  it('OPTIONS preflight from allowed origin → includes CORS headers', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/agents`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://stoicagentos.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization',
      },
    });
    // Preflight should succeed (200 or 204)
    expect([200, 204]).toContain(res.status);
    const acao = res.headers.get('access-control-allow-origin');
    expect(acao).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
//  Summary — printed after all groups finish
// ═══════════════════════════════════════════════════════════════

afterAll(() => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║      Smoke Test Summary                  ║');
  console.log('╠══════════════════════════════════════════╣');
  for (const { group, status } of summary) {
    const icon = status === 'ran' ? '✅' : '⏭️ ';
    console.log(`║  ${icon}  ${group.padEnd(33)}║`);
  }
  console.log('╚══════════════════════════════════════════╝\n');
});
