-- Migration 014: RAG Support for CRM Agents
-- Adds conversation memory and user profile fields for context-aware message generation
-- 2026-04-12

-- ── Lead Funnel RAG fields ──
ALTER TABLE crm_lead_funnel
  ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
  ADD COLUMN IF NOT EXISTS user_preferences JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_inbound_message TEXT,
  ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;

-- ── Executor Prospects RAG fields ──
ALTER TABLE crm_executor_prospects
  ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
  ADD COLUMN IF NOT EXISTS user_preferences JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_inbound_message TEXT,
  ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;

-- ── Composite index for fast RAG history retrieval ──
CREATE INDEX IF NOT EXISTS idx_crm_messages_rag_lookup
  ON crm_messages(entity_type, entity_id, sent_at DESC);
