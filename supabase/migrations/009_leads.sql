-- Migration 009: leads table for landing page lead capture
-- 2026-04-02

CREATE TABLE IF NOT EXISTS leads (
  id          BIGSERIAL PRIMARY KEY,
  phone       TEXT        NOT NULL,
  work_type   TEXT        NOT NULL,  -- 'labor' | 'equipment' | 'materials' | 'complex'
  city        TEXT        NOT NULL DEFAULT 'omsk',
  comment     TEXT,
  source      TEXT        NOT NULL DEFAULT 'landing',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for admin queries (by created_at desc)
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);

-- Index for deduplication check (phone + recent)
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone);

-- RLS: service role only (leads are internal, no public access needed)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by API route with service key)
CREATE POLICY "service_role_all" ON leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
