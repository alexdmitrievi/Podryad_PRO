-- Migration 010: payout_method column for flexible executor payouts
-- 2026-04-02

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_method TEXT
  DEFAULT 'manual_transfer'
  CHECK (payout_method IN ('yookassa_payout', 'manual_transfer', 'cash'));
