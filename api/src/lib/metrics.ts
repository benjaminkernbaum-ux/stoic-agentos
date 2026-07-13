/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — In-Memory Metrics Collector
 * ═══════════════════════════════════════════════════════
 *  Production metrics with zero external dependencies.
 *  Tracks per-endpoint: request count, error count,
 *  latency percentiles (p50/p95/p99), and throughput.
 *
 *  Uses a circular buffer for latency to cap memory.
 *  Auto-resets counters on configurable window (default 60s).
 */

// ── Types ──

interface EndpointMetrics {
  requests: number;
  errors: number;        // 4xx + 5xx
  server_errors: number; // 5xx only
  latencies: number[];   // circular buffer
  latency_idx: number;   // write head
}

interface Snapshot {
  uptime_seconds: number;
  started_at: string;
  total_requests: number;
  total_errors: number;
  total_server_errors: number;
  requests_per_minute: number;
  error_rate_percent: number;
  latency: {
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
    avg_ms: number;
  };
  endpoints: Record<string, {
    requests: number;
    errors: number;
    error_rate_percent: number;
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
  }>;
  active_connections: number;
}

// ── Constants ──

const LATENCY_BUFFER_SIZE = 1000; // per endpoint
const STARTED_AT = new Date().toISOString();

// ── State ──

const endpoints = new Map<string, EndpointMetrics>();
let totalRequests = 0;
let totalErrors = 0;
let totalServerErrors = 0;
let globalLatencies: number[] = [];
let globalLatencyIdx = 0;
let activeConnections = 0;

// ── Helpers ──

function getOrCreate(key: string): EndpointMetrics {
  let m = endpoints.get(key);
  if (!m) {
    m = {
      requests: 0,
      errors: 0,
      server_errors: 0,
      latencies: [],
      latency_idx: 0,
    };
    endpoints.set(key, m);
  }
  return m;
}

function pushLatency(arr: number[], idx: number, value: number): number {
  if (arr.length < LATENCY_BUFFER_SIZE) {
    arr.push(value);
    return arr.length;
  }
  arr[idx % LATENCY_BUFFER_SIZE] = value;
  return idx + 1;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function computePercentiles(latencies: number[]): { p50: number; p95: number; p99: number; avg: number } {
  if (latencies.length === 0) return { p50: 0, p95: 0, p99: 0, avg: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    avg,
  };
}

// ── Public API ──

/**
 * Record a completed request.
 * Call from the metrics middleware after response finishes.
 */
export function recordRequest(method: string, path: string, statusCode: number, durationMs: number): void {
  // Normalize path: remove UUIDs, IDs, query strings
  const normalized = normalizePath(method, path);

  const m = getOrCreate(normalized);
  m.requests++;
  m.latency_idx = pushLatency(m.latencies, m.latency_idx, durationMs);

  totalRequests++;
  globalLatencyIdx = pushLatency(globalLatencies, globalLatencyIdx, durationMs);

  if (statusCode >= 400) {
    m.errors++;
    totalErrors++;
  }
  if (statusCode >= 500) {
    m.server_errors++;
    totalServerErrors++;
  }
}

/**
 * Track active connections (for health readiness).
 */
export function connectionOpened(): void { activeConnections++; }
export function connectionClosed(): void { activeConnections = Math.max(0, activeConnections - 1); }

// ── Vector retrieval latency (dedicated instrumentation for episodic ──
//    vector search — step-4 hook for the partition-when-slow signal).
//    Kept separate from the endpoint metric so temporal (non-vector)
//    queries to /memory/episodic don't dilute the p95.
const vectorLatencies: number[] = [];
let vectorLatencyIdx = 0;
let vectorSamples = 0;

/** Record one match_episodic_memories retrieval, in ms. */
export function recordVectorRetrieval(durationMs: number): void {
  vectorLatencyIdx = pushLatency(vectorLatencies, vectorLatencyIdx, durationMs);
  vectorSamples++;
}

/** p50/p95/p99 for episodic vector retrieval since boot (circular-buffer window). */
export function getVectorRetrievalStats(): { samples: number; p50_ms: number; p95_ms: number; p99_ms: number; avg_ms: number } {
  const s = computePercentiles(vectorLatencies);
  return { samples: vectorSamples, p50_ms: s.p50, p95_ms: s.p95, p99_ms: s.p99, avg_ms: s.avg };
}

/**
 * Normalize a path for aggregation.
 * /api/v1/traces/550e8400-e29b-41d4-a716-446655440000 → GET /api/v1/traces/:id
 */
function normalizePath(method: string, rawPath: string): string {
  let path = rawPath.split('?')[0]; // strip query string
  // Replace UUIDs
  path = path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
  // Replace trace_ids like tr_abc123
  path = path.replace(/\/(tr_[a-z0-9]+)/gi, '/:trace_id');
  // Replace span_ids like sp_abc123
  path = path.replace(/\/(sp_[a-z0-9]+)/gi, '/:span_id');
  // Replace generic numeric IDs at end of path segments
  path = path.replace(/\/\d+(?=\/|$)/g, '/:id');
  return `${method} ${path}`;
}

/**
 * Get a full metrics snapshot for the /health/metrics endpoint.
 */
export function getMetricsSnapshot(): Snapshot {
  const uptimeSeconds = Math.floor(process.uptime());
  const uptimeMinutes = Math.max(1, uptimeSeconds / 60);
  const globalStats = computePercentiles(globalLatencies);

  const endpointData: Snapshot['endpoints'] = {};
  for (const [key, m] of endpoints) {
    const stats = computePercentiles(m.latencies);
    endpointData[key] = {
      requests: m.requests,
      errors: m.errors,
      error_rate_percent: m.requests > 0 ? parseFloat(((m.errors / m.requests) * 100).toFixed(2)) : 0,
      p50_ms: stats.p50,
      p95_ms: stats.p95,
      p99_ms: stats.p99,
    };
  }

  return {
    uptime_seconds: uptimeSeconds,
    started_at: STARTED_AT,
    total_requests: totalRequests,
    total_errors: totalErrors,
    total_server_errors: totalServerErrors,
    requests_per_minute: parseFloat((totalRequests / uptimeMinutes).toFixed(2)),
    error_rate_percent: totalRequests > 0 ? parseFloat(((totalErrors / totalRequests) * 100).toFixed(2)) : 0,
    latency: {
      p50_ms: globalStats.p50,
      p95_ms: globalStats.p95,
      p99_ms: globalStats.p99,
      avg_ms: globalStats.avg,
    },
    endpoints: endpointData,
    active_connections: activeConnections,
  };
}

/**
 * Quick health stats (for liveness probe — must be fast).
 */
export function getQuickStats(): { uptime: number; requests: number; errors: number } {
  return {
    uptime: Math.floor(process.uptime()),
    requests: totalRequests,
    errors: totalErrors,
  };
}

export default { recordRequest, getMetricsSnapshot, getQuickStats, connectionOpened, connectionClosed, recordVectorRetrieval, getVectorRetrievalStats };
