-- Migration 015: Evaluations table
-- Stores quality scores (human or LLM-as-judge) per trace or observation

CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trace_id UUID REFERENCES traces(id) ON DELETE CASCADE,
  observation_id UUID REFERENCES observations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,  -- e.g. 'relevance', 'correctness', 'helpfulness'
  score NUMERIC,  -- numeric score (0-1 normalized)
  value TEXT,  -- categorical value ('good', 'bad', 'neutral')
  comment TEXT,  -- human annotation or LLM reasoning
  source TEXT NOT NULL DEFAULT 'manual',  -- 'manual', 'llm', 'api', 'sdk'
  model TEXT,  -- if source='llm', which model judged
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evaluations_org ON evaluations(org_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_trace ON evaluations(trace_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_name ON evaluations(org_id, name);
CREATE INDEX IF NOT EXISTS idx_evaluations_source ON evaluations(org_id, source);

-- RLS
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY evaluations_org_isolation ON evaluations FOR ALL USING (org_id = current_setting('app.org_id')::uuid);
