-- Migration 028: track which paid orders have been crossposted to MAX channel
-- 2026-04-30

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS max_crossposted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.max_crossposted_at IS
  'Set when this order has been crossposted to the MAX channel. NULL = not yet posted.';

CREATE INDEX IF NOT EXISTS idx_orders_max_crosspost
  ON public.orders (status, max_crossposted_at)
  WHERE status = 'paid' AND max_crossposted_at IS NULL;
