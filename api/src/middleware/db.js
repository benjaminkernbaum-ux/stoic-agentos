import { createClient } from '@supabase/supabase-js';

// ── Config ──
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://viiagdhtzbvkfhcjqrlz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// ── Supabase Client (service role — bypasses RLS) ──
export const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// ── Plan Limits ──
export const PLAN_LIMITS = {
  free:       { workspaces: 2,  agents: 5,   observations: 10000,  knowledge_items: 5,  git_hooks: 3,  members: 1,  traces: 100,   alert_rules: 2  },
  pro:        { workspaces: 10, agents: 25,  observations: 100000, knowledge_items: 25, git_hooks: 15, members: 5,  traces: 5000,  alert_rules: 10 },
  team:       { workspaces: -1, agents: 100, observations: -1,     knowledge_items: -1, git_hooks: -1, members: 15, traces: -1,    alert_rules: -1 },
  enterprise: { workspaces: -1, agents: -1,  observations: -1,     knowledge_items: -1, git_hooks: -1, members: -1, traces: -1,    alert_rules: -1 },
};

export function checkLimit(plan, resource, current) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const max = limits[resource];
  if (max === -1) return true;
  return current < max;
}
