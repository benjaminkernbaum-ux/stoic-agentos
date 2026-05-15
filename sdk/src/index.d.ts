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

export declare class AgentOS {
  constructor(options?: AgentOSOptions);

  /** Capture an observation */
  capture(observation: Observation): Promise<void>;

  /** Flush queued observations to the API */
  flush(): Promise<void>;

  /** Wrap an agent function with auto-capture */
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
}

/** Create an AgentOS instance */
export declare function createAgentOS(options?: AgentOSOptions): AgentOS;

export default AgentOS;
