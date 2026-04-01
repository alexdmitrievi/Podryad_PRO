-- =============================================================
-- Подряд PRO — Миграция 006: Escrow payment support
-- =============================================================
-- Non-breaking: all new columns have DEFAULT NULL or DEFAULT false/''
-- Do NOT touch: order_id, status, executor_id, client_total, worker_payout, margin

-- ── 1. ALTER TABLE orders — add 18 new escrow columns (per D-01) ──

ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_fee_rate NUMERIC(4,2) DEFAULT 10.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_fee NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS combo_discount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_amount NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS escrow_status TEXT NOT NULL DEFAULT ''
  CHECK (escrow_status IN ('', 'payment_held', 'in_progress', 'pending_confirm', 'completed', 'disputed', 'cancelled'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS yookassa_payment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_captured BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_held_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_captured_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_confirmed BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_confirmed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supplier_confirmed BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supplier_confirmed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_status_escrow TEXT CHECK (payout_status_escrow IS NULL OR payout_status_escrow IN ('pending', 'processing', 'succeeded', 'failed'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- ── 2. ALTER TABLE workers — add payout columns (per D-04) ──

-- payout_card: last-4 digits for display only (never raw card number)
-- payout_card_synonym: YooKassa card synonym (PCI-safe token for Payouts API)
ALTER TABLE workers ADD COLUMN IF NOT EXISTS payout_card TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS payout_card_synonym TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_selfemployed_verified BOOLEAN DEFAULT false;

-- ── 3. CREATE TABLE escrow_ledger (per D-05) ──
-- IMPORTANT: column is `type` (NOT `event_type`)

CREATE TABLE IF NOT EXISTS escrow_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  type TEXT NOT NULL CHECK (type IN ('hold', 'capture', 'release', 'refund', 'payout')),
  amount NUMERIC(10,2) NOT NULL,
  yookassa_operation_id TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_order ON escrow_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_type ON escrow_ledger(type);

-- ── 4. CREATE TABLE disputes (per D-05) ──

CREATE TABLE IF NOT EXISTS disputes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  initiated_by TEXT NOT NULL CHECK (initiated_by IN ('customer', 'supplier')),
  reason TEXT NOT NULL,
  description TEXT,
  resolution TEXT CHECK (resolution IS NULL OR resolution IN ('refund_full', 'refund_partial', 'release_payment', 'pending')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_disputes_order ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_resolution ON disputes(resolution);

-- ── 5. RLS for new tables (service_role only) ──

ALTER TABLE escrow_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escrow_ledger_service_all" ON escrow_ledger
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disputes_service_all" ON disputes
  FOR ALL USING (auth.role() = 'service_role');

-- ── 6. Indexes on orders escrow columns ──

CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON orders(escrow_status) WHERE escrow_status != '';
CREATE INDEX IF NOT EXISTS idx_orders_payment_held ON orders(payment_held_at) WHERE payment_captured = false AND escrow_status = 'payment_held';
CREATE INDEX IF NOT EXISTS idx_orders_yookassa_pid ON orders(yookassa_payment_id) WHERE yookassa_payment_id IS NOT NULL;

-- ── 7. pg_cron + pg_net extensions and auto-capture cron job (per D-03) ──

-- Enable pg_net and pg_cron extensions (Supabase Pro plan required)
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- IMPORTANT: Before this migration runs, set these database secrets:
--   ALTER DATABASE postgres SET app.cron_webhook_url = 'https://podryad.pro/api/cron/capture-expired';
--   ALTER DATABASE postgres SET app.cron_secret = '<your-cron-secret>';
-- These can also be set via Supabase Dashboard -> Settings -> Vault -> Secrets

-- Register auto-capture cron job (09:00 MSK = 06:00 UTC daily)
SELECT cron.schedule(
  'auto-capture-escrow-holds',
  '0 6 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.cron_webhook_url', true),
    headers := json_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    )::jsonb,
    body := '{}'::jsonb
  )$$
);
