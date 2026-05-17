-- =============================================
-- Stoic AgentOS — Migration 002
-- Traces, Spans, Knowledge Edges, Alerts
-- Run in Supabase SQL Editor
-- =============================================

-- ── Traces (groups related LLM calls) ──
CREATE TABLE IF NOT EXISTS traces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  trace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  agent TEXT,
  status TEXT DEFAULT 'running' CHECK (status IN ('running','success','error')),
  duration_ms INTEGER,
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd NUMERIC(10,6) DEFAULT 0,
  span_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE traces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "traces_org_isolation" ON traces FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE INDEX idx_traces_org ON traces(org_id);
CREATE INDEX idx_traces_org_created ON traces(org_id, created_at DESC);
CREATE INDEX idx_traces_trace_id ON traces(trace_id);

-- ── Spans (individual LLM calls within a trace) ──
CREATE TABLE IF NOT EXISTS spans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  trace_id UUID REFERENCES traces(id) ON DELETE CASCADE NOT NULL,
  span_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  type TEXT DEFAULT 'chat.completions',
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  latency_ms INTEGER,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  status TEXT DEFAULT 'success' CHECK (status IN ('success','error')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE spans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spans_org_isolation" ON spans FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE INDEX idx_spans_trace ON spans(trace_id);
CREATE INDEX idx_spans_org ON spans(org_id);
CREATE INDEX idx_spans_org_created ON spans(org_id, created_at DESC);

-- ── Knowledge Edges (relationships between entities) ──
CREATE TABLE IF NOT EXISTS knowledge_edges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  source_entity TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  relationship TEXT NOT NULL,
  weight INTEGER DEFAULT 1,
  observation_id UUID REFERENCES observations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE knowledge_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edges_org_isolation" ON knowledge_edges FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE INDEX idx_edges_org ON knowledge_edges(org_id);
CREATE INDEX idx_edges_source ON knowledge_edges(org_id, source_entity);

-- ── Alert Rules ──
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('error_rate','usage_limit','agent_down','cost_threshold')),
  config JSONB DEFAULT '{}',
  channel TEXT DEFAULT 'email' CHECK (channel IN ('email','webhook')),
  destination TEXT,
  active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_org_isolation" ON alert_rules FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE INDEX idx_alert_rules_org ON alert_rules(org_id);

-- ── Alert Events ──
CREATE TABLE IF NOT EXISTS alert_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  details TEXT,
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alert_events_org_isolation" ON alert_events FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE INDEX idx_alert_events_org ON alert_events(org_id, created_at DESC);

-- ══════════════════════════════════════
-- DONE — 5 new tables created
-- ══════════════════════════════════════
