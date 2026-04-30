-- Migration 030: Payment gateway scaffold
-- 2026-04-30
--
-- Adds three columns to orders to support a future payment gateway
-- (Tinkoff / YooKassa / CloudPayments) without breaking the current
-- manual flow.  All columns default to NULL — existing records are
-- unaffected.
--
-- Column semantics:
--   payment_gateway          — which provider was used ('tinkoff' | 'yookassa' | 'cloudpayments')
--   payment_gateway_order_id — provider's internal payment/order ID (for webhook verification)
--   payment_gateway_url      — redirect URL sent to the customer for online payment
--   payment_confirmed_at     — timestamp set by the gateway webhook (vs manual admin action)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_gateway           TEXT
    CHECK (payment_gateway IS NULL OR payment_gateway IN ('tinkoff', 'yookassa', 'cloudpayments', 'manual')),
  ADD COLUMN IF NOT EXISTS payment_gateway_order_id  TEXT,
  ADD COLUMN IF NOT EXISTS payment_gateway_url       TEXT,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at      TIMESTAMPTZ;

-- Index for webhook look-ups (gateway posts order_id in the body)
CREATE INDEX IF NOT EXISTS idx_orders_gateway_order_id
  ON public.orders (payment_gateway_order_id)
  WHERE payment_gateway_order_id IS NOT NULL;

COMMENT ON COLUMN public.orders.payment_gateway IS
  'Payment provider used for this order. NULL = manual SBP/bank-transfer flow.';
COMMENT ON COLUMN public.orders.payment_gateway_order_id IS
  'Provider-assigned payment ID for webhook signature verification.';
COMMENT ON COLUMN public.orders.payment_gateway_url IS
  'Hosted payment page URL returned by the provider after session creation.';
COMMENT ON COLUMN public.orders.payment_confirmed_at IS
  'Timestamp when the gateway webhook confirmed successful payment.
   Distinct from payment_paid_at which is set by admin in the manual flow.';
