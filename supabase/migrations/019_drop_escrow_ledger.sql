-- Migration 019: Drop orphaned escrow_ledger table
-- The escrow system was fully removed in migration 018,
-- but the escrow_ledger table itself was not dropped.

DROP TABLE IF EXISTS escrow_ledger;
