-- ============================================================================
-- 032_fix_payout_method_default.sql
-- Fix: orders.payout_method DEFAULT 'manual_transfer' violates CHECK constraint
-- ============================================================================
-- Bug: Migration 017 changed the CHECK constraint to allow only
--      ('sbp', 'bank_transfer', 'cash') + NULL, but the DEFAULT from
--      migration 010 ('manual_transfer') was never updated.
-- Impact: All INSERT operations on orders that don't explicitly set
--          payout_method fail with 23514 check_violation.
-- Fix: Set DEFAULT to NULL and update any existing 'manual_transfer' values.
-- ============================================================================

-- 1. Update any existing rows that still have 'manual_transfer'
UPDATE orders SET payout_method = NULL WHERE payout_method = 'manual_transfer';

-- 2. Change the column DEFAULT
ALTER TABLE orders ALTER COLUMN payout_method SET DEFAULT NULL;

-- 3. Re-apply the CHECK constraint (belt-and-suspenders, in case it was dropped)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payout_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payout_method_check
  CHECK (payout_method IS NULL OR payout_method IN ('sbp', 'bank_transfer', 'cash'));
