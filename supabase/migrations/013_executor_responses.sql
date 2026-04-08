-- Migration 013: executor_responses table for dashboard order responses
-- Responses from executors go to admin for review, not to customers

CREATE TABLE IF NOT EXISTS executor_responses (
  id          BIGSERIAL PRIMARY KEY,
  order_id    TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  comment     TEXT,
  price       NUMERIC,
  status      TEXT        NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'rejected'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_executor_responses_order_id ON executor_responses (order_id);
CREATE INDEX IF NOT EXISTS idx_executor_responses_status ON executor_responses (status);
CREATE INDEX IF NOT EXISTS idx_executor_responses_created_at ON executor_responses (created_at DESC);

ALTER TABLE executor_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON executor_responses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
