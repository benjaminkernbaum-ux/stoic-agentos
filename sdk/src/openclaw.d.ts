/**
 * @stoic/agentos-sdk/openclaw — TypeScript Definitions
 */
import { AgentOS, AgentModule, Observation } from './index.d.ts';

export interface OpenclawInitOptions {
  apiKey?: string;
  apiUrl?: string;
  workspace?: string;
  debug?: boolean;
}

export interface LogSkillOptions {
  module?: AgentModule;
  description?: string;
}

export interface KnowledgeItemInput {
  name: string;
  summary?: string;
  content?: string;
  artifacts?: unknown[];
}

export interface ExtraSkill {
  name: string;
  module?: AgentModule;
}

/** Maps each built-in OpenClaw skill name to its AgentOS module. */
export declare const SKILL_MODULE_MAP: Record<string, AgentModule>;

/** Initialize (or re-initialize) the AgentOS client used by skill helpers. */
export declare function init(options?: OpenclawInitOptions): AgentOS;

/** Get the active AgentOS client (initializes lazily). */
export declare function getClient(): AgentOS;

/** Wrap a skill's entry function with auto-register/observe/heartbeat. */
export declare function logSkill<T extends (...args: any[]) => Promise<any>>(
  skillName: string,
  fn: T,
  options?: LogSkillOptions
): T;

/** One-off observation from inside a skill body. */
export declare function observe(observation: Observation): Promise<void>;

/** Persist a memory in the cross-machine knowledge_items table. */
export declare function rememberKnowledge(item: KnowledgeItemInput): Promise<unknown>;

/** Retrieve knowledge items (optionally filter by free-text query). */
export declare function recallKnowledge(query?: string): Promise<unknown>;

/** Bulk-register all 25 built-in OpenClaw skills as AgentOS agents. */
export declare function registerAllSkills(
  extra?: ExtraSkill[]
): Promise<PromiseSettledResult<unknown>[]>;
