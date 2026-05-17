/**
 * @stoic/agentos-sdk — TypeScript Definitions
 */

export interface AgentOSOptions {
  /** Your API key from the dashboard (sk_live_xxx) */
  apiKey?: string;
  /** Custom API endpoint */
  apiUrl?: string;
  /** Workspace identifier */
  workspace?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Flush after N observations (default: 10) */
  batchSize?: number;
  /** Auto-flush interval in ms (default: 5000) */
  flushInterval?: number;
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

export type ObservationType =
  | 'note'
  | 'decision'
  | 'architecture'
  | 'deployment'
  | 'discovery'
  | 'file_edit'
  | 'error'
  | 'git_commit'
  | 'agent_run';

export type AgentModule =
  | 'content'
  | 'gtm'
  | 'crm'
  | 'finance'
  | 'standalone';

export interface Observation {
  /** Observation type */
  type?: ObservationType;
  /** Short title */
  title: string;
  /** Detailed content */
  content?: string;
  /** Agent name/ID */
  agent?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface AgentDefinition {
  /** Agent name */
  name: string;
  /** Agent description */
  description?: string;
  /** Agent module category */
  module?: AgentModule;
}

export interface Stats {
  agents: number;
  workspaces: number;
  observations: number;
  knowledgeItems: number;
  plan: string;
  observationLimit: number;
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

export interface Trace {
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

export declare class AgentOS {
  constructor(options?: AgentOSOptions);

  /**
   * Auto-instrument OpenAI and Anthropic SDK calls.
   * Call once at startup — all subsequent LLM calls are captured automatically.
   */
  instrument(options?: InstrumentOptions): InstrumentResult;

  /**
   * Execute a function within a named trace.
   * All LLM calls made inside the function are grouped into one trace.
   */
  trace<T>(
    name: string,
    fn: (ctx: TraceContextHandle) => Promise<T>,
    options?: { agent?: string }
  ): Promise<T>;

  /** Capture an observation */
  capture(observation: Observation): Promise<void>;

  /** Flush queued observations to the API */
  flush(): Promise<void>;

  /** Wrap an agent function with auto-capture and auto-tracing */
  wrapAgent<T extends (...args: any[]) => Promise<any>>(
    agentName: string,
    fn: T
  ): T;

  /** Register an agent with the platform */
  registerAgent(agent: AgentDefinition): Promise<any>;

  /** Get dashboard stats */
  getStats(): Promise<Stats>;

  /** List recent observations */
  getObservations(options?: {
    limit?: number;
    type?: ObservationType;
    workspace?: string;
  }): Promise<Observation[]>;

  /** List traces */
  getTraces(options?: {
    limit?: number;
    agent?: string;
    status?: 'success' | 'error';
  }): Promise<Trace[]>;

  /** Graceful shutdown — flush all pending data */
  shutdown(): Promise<void>;
}

/** Create an AgentOS instance */
export declare function createAgentOS(options?: AgentOSOptions): AgentOS;

export default AgentOS;
