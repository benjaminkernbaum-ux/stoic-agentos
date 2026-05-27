/**
 * @stoic/agentos-sdk — TypeScript Definitions v2.1.0
 * Complete type-safe interface for the Stoic AgentOS SDK
 */

// ── Error Classes ──

export declare class AgentOSError extends Error {
  code: string;
  statusCode: number;
  constructor(message: string, code: string, statusCode: number);
}

export declare class AgentOSValidationError extends AgentOSError {
  constructor(message: string);
}

export declare class AgentOSAuthError extends AgentOSError {
  constructor(message: string);
}

export declare class AgentOSRateLimitError extends AgentOSError {
  limit: number;
  current: number;
  constructor(message: string, limit: number, current: number);
}

// ── Options & Config ──

export interface AgentOSOptions {
  /** Your API key from the dashboard (sk_live_xxx) */
  apiKey?: string;
  /** Custom API endpoint (default: production) */
  apiUrl?: string;
  /** Workspace identifier (default: 'default') */
  workspace?: string;
  /** Enable debug logging to console (default: false) */
  debug?: boolean;
  /** Flush after N observations (default: 10) */
  batchSize?: number;
  /** Auto-flush interval in ms (default: 5000) */
  flushInterval?: number;
  /** Max retries on network/rate-limit errors (default: 3) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (default: 500) */
  baseDelay?: number;
}

export interface InstrumentOptions {
  /** Instrument OpenAI SDK (default: true) */
  openai?: boolean;
  /** Instrument Anthropic SDK (default: true) */
  anthropic?: boolean;
  /** Include prompt metadata in spans (default: false) */
  capturePrompts?: boolean;
}

export interface InstrumentResult {
  /** Whether OpenAI SDK was successfully instrumented */
  openai: boolean;
  /** Whether Anthropic SDK was successfully instrumented */
  anthropic: boolean;
}

// ── Data Types ──

export type ObservationType =
  | 'note'
  | 'decision'
  | 'architecture'
  | 'deployment'
  | 'discovery'
  | 'file_edit'
  | 'error'
  | 'git_commit'
  | 'agent_run'
  | 'command'
  | 'dependency'
  | 'config';

export type AgentModule =
  | 'content'
  | 'gtm'
  | 'crm'
  | 'finance'
  | 'standalone'
  | string;

export interface Observation {
  /** Observation type */
  type?: ObservationType;
  /** Short title (required) */
  title: string;
  /** Detailed content */
  content?: string;
  /** Agent name/ID */
  agent?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface AgentDefinition {
  /** Agent name (required) */
  name: string;
  /** Agent description */
  description?: string;
  /** Agent module category */
  module?: AgentModule;
}

export interface Stats {
  plan: string;
  agents: number;
  workspaces: number;
  observations: number;
  knowledgeItems: number;
  observationLimit: number;
  traces_this_month: number;
  trace_limit: number;
  total_cost_this_month: number;
  unacknowledged_alerts: number;
}

export interface Span {
  span_id: string;
  provider: 'openai' | 'anthropic';
  model: string;
  type: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number;
  cost_usd: number;
  status: 'success' | 'error';
  error_message?: string;
  started_at: string;
  ended_at: string;
  metadata?: Record<string, unknown>;
}

export interface TraceData {
  trace_id: string;
  name: string;
  agent?: string;
  status: 'running' | 'success' | 'error';
  duration_ms: number;
  total_tokens: number;
  total_cost_usd: number;
  span_count: number;
  started_at: string;
  ended_at?: string;
  spans?: Span[];
}

export interface TraceContextHandle {
  traceId: string;
  recordSpan: (span: Partial<Span>) => void;
}

export interface SummarizeOptions {
  /** Max observations to include (default: 50) */
  limit?: number;
  /** Filter to a specific agent */
  agent_id?: string;
  /** Claude model to use (default: 'claude-haiku-4-5') */
  model?: string;
}

export interface SummarizeResult {
  summary: string;
  count: number;
  model: string;
  usage: Record<string, number>;
}

export interface AnalyzeAgentResult {
  analysis: string;
  agent: { id: string; name: string; status: string; error_rate: number };
  model: string;
  usage: Record<string, number>;
}

export interface AskResult {
  answer: string;
  model: string;
  usage: Record<string, number>;
}

export interface ModelPricing {
  input: number;
  output: number;
}

// ── Main Class ──

export declare class AgentOS {
  /** The configured API key */
  readonly apiKey: string;
  /** The API endpoint URL */
  readonly apiUrl: string;
  /** The workspace identifier */
  readonly workspace: string;
  /** Whether debug logging is enabled */
  readonly debug: boolean;

  constructor(options?: AgentOSOptions);

  /**
   * Instrument a specific LLM client for automatic trace capture.
   * @param provider - 'openai' or 'anthropic'
   * @param client - The SDK client instance
   * @returns this (for chaining)
   * @throws {AgentOSValidationError} If provider is unknown or client is invalid
   */
  instrumentClient(provider: 'openai' | 'anthropic', client: object): this;

  /**
   * Start a new trace that groups related LLM calls.
   * @param name - Trace name (e.g., 'process-customer-email')
   * @param options - Optional agent name and metadata
   * @returns Trace instance - call trace.end() when done
   * @throws {AgentOSValidationError} If name is missing
   */
  startTrace(name: string, options?: { agent?: string; metadata?: Record<string, unknown> }): Trace;

  /** End the active trace (if any) */
  endTrace(status?: 'success' | 'error'): Promise<void>;

  /**
   * Capture an observation (buffered, auto-flushed).
   * @throws {AgentOSValidationError} If title is missing or type is invalid
   */
  capture(observation: Observation): Promise<void>;

  /** Flush all queued observations to the API immediately */
  flush(): Promise<void>;

  /**
   * Wrap an agent function with automatic tracing and heartbeats.
   * @throws {AgentOSValidationError} If agentName or fn is invalid
   */
  wrapAgent<T extends (...args: any[]) => Promise<any>>(
    agentName: string,
    fn: T
  ): T;

  /**
   * Register an agent with the platform.
   * @throws {AgentOSValidationError} If agent.name is missing
   */
  registerAgent(agent: AgentDefinition): Promise<any>;

  /** Get dashboard stats */
  getStats(): Promise<Stats | null>;

  /** List recent observations with optional filters */
  getObservations(options?: {
    limit?: number;
    type?: ObservationType;
    workspace?: string;
  }): Promise<Observation[] | null>;

  /** List traces with optional filters */
  getTraces(options?: {
    limit?: number;
    agent?: string;
    status?: 'success' | 'error';
  }): Promise<TraceData[] | null>;

  /**
   * Summarize recent observations using Claude.
   * Requires an Anthropic key configured on the org.
   */
  summarize(options?: SummarizeOptions): Promise<SummarizeResult | null>;

  /**
   * Deep analysis of a specific agent using Claude Sonnet.
   * @throws {AgentOSValidationError} If agentId is missing
   */
  analyzeAgent(agentId: string, includeTraces?: boolean): Promise<AnalyzeAgentResult | null>;

  /**
   * Ask a free-form question grounded in your org's data.
   * @throws {AgentOSValidationError} If question is missing
   */
  ask(question: string, context?: string): Promise<AskResult | null>;

  /** Three-Tier Memory system: working, episodic, semantic + hybrid recall */
  readonly memory: MemoryClient;

  /** Compliance & Audit: immutable logs, circuit breaker, SIEM export */
  readonly compliance: ComplianceClient;

  /** Graceful shutdown — flush all pending data */
  shutdown(): Promise<void>;
}

// ── Memory Client ──

export interface RecallResult {
  mode: 'quick' | 'standard' | 'deep';
  query: string;
  temporal_window: string | null;
  working: any[];
  episodic: any[];
  semantic: any[];
  total: number;
}

export interface MemoryStats {
  working_memory: { count: number };
  episodic_memory: { count: number };
  semantic_memory: { count: number };
  total: number;
}

export declare class MemoryClient {
  /** Store/update a working memory entry */
  setWorking(sessionId: string, key: string, value: any, options?: { agentId?: string; expiresInSeconds?: number }): Promise<any>;
  /** Retrieve working memory for a session */
  getWorking(sessionId: string, options?: { agentId?: string; key?: string }): Promise<any[] | null>;
  /** Clear all working memory for a session */
  clearWorking(sessionId: string, options?: { agentId?: string }): Promise<any>;
  /** Record a timestamped episode with auto-embedding */
  recordEpisode(content: string, options?: { eventType?: string; importance?: number; agentId?: string; metadata?: Record<string, unknown> }): Promise<any>;
  /** List episodes with filters */
  listEpisodes(options?: { agentId?: string; eventType?: string; limit?: number; since?: string; until?: string }): Promise<any[] | null>;
  /** Mark an episode as no longer valid */
  invalidateEpisode(episodeId: string): Promise<any>;
  /** Store or strengthen a knowledge triple */
  storeTriple(subject: string, relation: string, object: string, options?: { confidence?: number; sourceType?: string }): Promise<any>;
  /** Query knowledge triples */
  queryTriples(options?: { subject?: string; relation?: string; object?: string; minConfidence?: number; limit?: number }): Promise<any[] | null>;
  /** Delete a semantic triple */
  deleteTriple(tripleId: string): Promise<any>;
  /** Fused retrieval across all three memory tiers */
  recall(query: string, options?: { mode?: 'quick' | 'standard' | 'deep'; agentId?: string; sessionId?: string; temporalWindow?: string; maxResults?: number }): Promise<RecallResult | null>;
  /** Get memory statistics across all tiers */
  stats(): Promise<MemoryStats | null>;
}

// ── Compliance Client ──

export interface ComplianceStats {
  total_events: number;
  last_24h: number;
  last_7d: number;
  halts: number;
  escalations: number;
  circuit_breaker_available: boolean;
  siem_export_available: boolean;
}

export declare class ComplianceClient {
  /** Log an immutable audit event */
  logEvent(eventType: string, action: string, options?: { agentId?: string; reasoning?: string; context?: any; policyVersion?: string; verdict?: string; metadata?: Record<string, unknown> }): Promise<any>;
  /** Batch-log up to 100 audit events */
  logBatch(events: Array<{ event_type: string; action: string; [key: string]: any }>): Promise<any>;
  /** Query audit log with filters */
  getEvents(options?: { agentId?: string; eventType?: string; verdict?: string; from?: string; to?: string; limit?: number }): Promise<any[] | null>;
  /** Export audit trail for compliance (Team+ plans) */
  export(from: string, to: string, options?: { format?: 'json' | 'ndjson'; agentId?: string; eventType?: string }): Promise<any>;
  /** Fleet-wide circuit breaker (EU AI Act Article 14) */
  circuitBreaker(action: 'HALT_ALL' | 'RESUME_ALL', reason?: string): Promise<any>;
  /** Get compliance dashboard stats */
  stats(): Promise<ComplianceStats | null>;
}

/** Create an AgentOS instance (convenience function) */
export declare function createAgentOS(options?: AgentOSOptions): AgentOS;

/** Estimate the cost of an LLM call based on model and token counts */
export declare function estimateCost(
  model: string,
  promptTokens?: number,
  completionTokens?: number
): number;

/** Model pricing table (USD per 1M tokens) */
export declare const MODEL_PRICING: Record<string, ModelPricing>;

/** Trace class for grouping related LLM calls */
export declare class Trace {
  traceId: string;
  name: string;
  agent: string | null;
  spans: Span[];
  status: 'running' | 'success' | 'error';

  constructor(sdk: AgentOS, name: string, options?: { agent?: string; metadata?: Record<string, unknown> });
  addSpan(span: Partial<Span>): void;
  end(status?: 'success' | 'error'): Promise<any>;
}

export default AgentOS;
