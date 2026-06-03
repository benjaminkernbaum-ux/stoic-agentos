import type { Request } from 'express';

export interface Organization {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  stripe_customer_id?: string;
  anthropic_api_key?: string;
  hot_cache?: string | null;
  hot_cache_updated_at?: string | null;
  hot_cache_stale?: boolean;
  smtp_key_vault_id?: string | null;
  twilio_key_vault_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  org_id: string;
  name: string;
  description: string;
  module: string;
  status: string;
  config: Record<string, unknown>;
  last_heartbeat?: string;
  total_runs: number;
  total_errors: number;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  org_id: string;
  key: string;
  name: string;
  active: boolean;
  last_used_at?: string;
  organizations: Organization;
}

export interface Observation {
  id: string;
  org_id: string;
  type: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  agent_name?: string;
  created_at: string;
}

export interface KnowledgeItem {
  id: string;
  org_id: string;
  name: string;
  summary: string;
  content: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface AuthenticatedRequest extends Request {
  org: Organization;
  user?: { id: string; email: string };
  apiKey?: ApiKey;
  role?: string;
}

export interface PlanLimits {
  workspaces: number;
  agents: number;
  observations: number;
  knowledge_items: number;
  git_hooks: number;
  members: number;
  traces: number;
  alert_rules: number;
}

export type PlanName = 'free' | 'pro' | 'team' | 'enterprise';
