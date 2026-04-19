-- Migration 021: Add missing indexes on hot query paths
-- 2026-04-19
--
-- Covers performance-critical queries identified in the production audit:
--   1. customer_tokens.phone — looked up on every /api/my/recover and escrow flow
--   2. crm_executor_prospects (stage, next_followup_at) — WF-19 cron (every 6h)
--   3. crm_lead_funnel (stage, next_followup_at) — similar pattern
--   4. orders (status, created_at DESC) — admin dashboard, WF-07 MAX cross-post
--   5. orders partial filter for unpublished with coordinates — WF-07 hot filter

-- 1) customer_tokens lookup by phone
CREATE INDEX IF NOT EXISTS idx_customer_tokens_phone
  ON customer_tokens(phone);

-- 2) WF-19: stage IN (...) ORDER BY next_followup_at ASC NULLS FIRST
CREATE INDEX IF NOT EXISTS idx_crm_prospects_stage_followup
  ON crm_executor_prospects(stage, next_followup_at ASC NULLS FIRST);

-- 3) Same pattern for lead funnel
CREATE INDEX IF NOT EXISTS idx_crm_lead_funnel_stage_followup
  ON crm_lead_funnel(stage, next_followup_at ASC NULLS FIRST);

-- 4) Orders list + sort (admin dashboard, public orders feed)
CREATE INDEX IF NOT EXISTS idx_orders_status_created_desc
  ON orders(status, created_at DESC);

-- 5) WF-07 MAX cross-post runs every 2 min; partial index keeps it cheap
CREATE INDEX IF NOT EXISTS idx_orders_wf07_unpublished
  ON orders(created_at DESC)
  WHERE max_posted IS NOT TRUE
    AND lat IS NOT NULL
    AND lon IS NOT NULL
    AND status IN ('paid', 'in_progress');
