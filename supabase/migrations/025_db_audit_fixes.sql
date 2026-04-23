-- Migration 025: DB audit hardening — FK constraint + updated_at triggers
-- 2026-04-22
--
-- Issues found by infra audit:
-- 1. executor_responses.order_id has no FK → orphaned responses possible
-- 2. High-mutability tables (orders, disputes, executor_responses, leads,
--    crm_messages) lack updated_at → audit trail incomplete

-- ── 1. Add FK constraint on executor_responses.order_id ────────────────
-- CASCADE DELETE: if an order is deleted, its responses go with it.
ALTER TABLE executor_responses
  ADD CONSTRAINT fk_executor_responses_order
  FOREIGN KEY (order_id)
  REFERENCES orders(order_id)
  ON DELETE CASCADE;

-- ── 2. Add updated_at to orders ────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Back-fill from created_at so existing rows are not NULL
UPDATE orders SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE orders
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 3. Add updated_at to disputes ──────────────────────────────────────
ALTER TABLE disputes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE disputes SET updated_at = COALESCE(resolved_at, created_at) WHERE updated_at IS NULL;

ALTER TABLE disputes
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS disputes_set_updated_at ON disputes;
CREATE TRIGGER disputes_set_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 4. Add updated_at to executor_responses ────────────────────────────
ALTER TABLE executor_responses
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE executor_responses SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE executor_responses
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS executor_responses_set_updated_at ON executor_responses;
CREATE TRIGGER executor_responses_set_updated_at
  BEFORE UPDATE ON executor_responses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 5. Add updated_at to leads ─────────────────────────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE leads SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE leads
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS leads_set_updated_at ON leads;
CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 6. Add updated_at to crm_messages ─────────────────────────────────
ALTER TABLE crm_messages
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE crm_messages SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE crm_messages
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS crm_messages_set_updated_at ON crm_messages;
CREATE TRIGGER crm_messages_set_updated_at
  BEFORE UPDATE ON crm_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 7. site_images — add created_at for consistency ───────────────────
ALTER TABLE site_images
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── 8. executor_responses.price precision ─────────────────────────────
-- NUMERIC without precision → NUMERIC(12,2) to match orders amounts
ALTER TABLE executor_responses
  ALTER COLUMN price TYPE NUMERIC(12,2);
