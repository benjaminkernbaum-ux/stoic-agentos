-- ═══════════════════════════════════════════════════════════
--  011: Chat Conversations Persistence
-- ═══════════════════════════════════════════════════════════
--  Stores chat conversations in Supabase so they survive
--  server restarts and can be loaded across sessions.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conv_id TEXT NOT NULL,
  mode TEXT DEFAULT 'stoic',
  title TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  message_count INT DEFAULT 0,
  last_model TEXT,
  total_tokens INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, conv_id)
);

-- Fast lookups by org + recency
CREATE INDEX IF NOT EXISTS idx_chat_conv_org_updated
  ON chat_conversations(org_id, updated_at DESC);

-- RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_conversations' AND policyname = 'chat_conversations_org_isolation'
  ) THEN
    CREATE POLICY chat_conversations_org_isolation ON chat_conversations
      USING (org_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid);
  END IF;
END $$;
