---
phase: 01-escrow-core
plan: "01"
subsystem: database
tags: [escrow, migration, typescript, supabase, pg-cron]
dependency_graph:
  requires: []
  provides:
    - supabase/migrations/006_escrow.sql
    - pwa/src/lib/types.ts (EscrowStatus, EscrowLedgerEntry, Dispute)
    - pwa/src/lib/db.ts (escrow query functions)
  affects:
    - 01-02 (YooKassa functions use EscrowStatus, insertEscrowLedger)
    - 01-03 (Payment API routes use escrow DB columns)
    - 01-04 (Order confirm/dispute API uses createDispute, getDisputesByOrder)
    - 01-05 (UI pages use Order.escrow_status, Order.customer_confirmed etc.)
tech_stack:
  added: [pg_cron, pg_net]
  patterns:
    - TEXT NOT NULL DEFAULT '' CHECK(...) for escrow_status (not ENUM — per project constraints)
    - DEFAULT NULL on all new order columns (non-breaking for Telegram bot)
    - service_role-only RLS on escrow_ledger and disputes tables
    - Partial indexes on escrow columns for query performance
key_files:
  created:
    - supabase/migrations/006_escrow.sql
    - .planning/phases/01-escrow-core/01-01-SUMMARY.md
  modified:
    - pwa/src/lib/types.ts
    - pwa/src/lib/db.ts
decisions:
  - "Used TEXT NOT NULL DEFAULT '' CHECK(...) for escrow_status per project constraint (not ENUM)"
  - "escrow_ledger.type column named 'type' (not 'event_type') per plan authoritative spec"
  - "Import EscrowStatus + PayoutStatusEscrow into db.ts for proper type casts in orderFromDb mapper"
  - "Pre-existing db.ts TS error (getTopWorkers parameter 'w' implicit any) is out of scope — not introduced by this plan"
metrics:
  duration_minutes: 6
  completed_date: "2026-04-01"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 2
---

# Phase 1 Plan 1: DB Migration + TypeScript Types + db.ts Mapper Summary

**One-liner:** PostgreSQL escrow schema via 006_escrow.sql (18 order columns, 2 new tables, pg_cron auto-capture) with mirrored TypeScript types and orderFromDb mapper extension.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create migration 006_escrow.sql | 179a0d3 | supabase/migrations/006_escrow.sql |
| 2 | Update TypeScript types | 38536cc | pwa/src/lib/types.ts |
| 3 | Update orderFromDb mapper + escrow DB helpers | 2d6ad76 | pwa/src/lib/db.ts |

## What Was Built

### supabase/migrations/006_escrow.sql

Non-breaking migration adding escrow infrastructure to the existing database:

- **18 new columns on `orders`** — all `DEFAULT NULL` or `DEFAULT false/''` so existing Telegram bot queries are unaffected. Includes: `subtotal`, `service_fee_rate`, `service_fee`, `combo_discount`, `total`, `payout_amount`, `escrow_status` (TEXT NOT NULL DEFAULT '' with CHECK), `yookassa_payment_id`, `payment_captured`, `payment_held_at`, `payment_captured_at`, `customer_confirmed`, `customer_confirmed_at`, `supplier_confirmed`, `supplier_confirmed_at`, `payout_status_escrow`, `payout_id`, `customer_phone`, `customer_email`.
- **3 new columns on `workers`** — `payout_card` (last-4 for display), `payout_card_synonym` (YooKassa PCI-safe token), `is_selfemployed_verified`.
- **`escrow_ledger` table** — audit log for hold/capture/release/refund/payout operations. Column `type` (NOT `event_type`).
- **`disputes` table** — dispute tracking with `initiated_by`, `reason`, `resolution` fields.
- **RLS policies** — `service_role` only for both new tables.
- **Partial indexes** — on `escrow_status`, `payment_held_at`, `yookassa_payment_id` for efficient filtering.
- **pg_cron job** — `auto-capture-escrow-holds` runs at `0 6 * * *` (09:00 MSK), calls `pg_net.http_post` to `/api/cron/capture-expired` with `x-cron-secret` header. Reads URL and secret from `current_setting('app.cron_webhook_url'/'app.cron_secret')`.

### pwa/src/lib/types.ts

- Added `EscrowStatus` type alias (7 values including empty string)
- Added `PayoutStatusEscrow` type alias
- Extended `Order` interface with 18 optional escrow fields
- Extended `Worker` interface with 3 optional payout fields
- Added `EscrowLedgerType` type alias
- Added `EscrowLedgerEntry` interface
- Added `DisputeResolution` type alias
- Added `Dispute` interface

### pwa/src/lib/db.ts

- Updated import to include `EscrowStatus`, `PayoutStatusEscrow`, `EscrowLedgerEntry`, `Dispute`
- Extended `orderFromDb()` to map all 18 escrow fields with proper type casts
- Added 5 new escrow query functions:
  - `insertEscrowLedger()` — log escrow operation
  - `getEscrowLedger()` — fetch ledger entries for an order
  - `getOrdersWithExpiringHolds()` — find orders with holds older than 6 days (for cron)
  - `createDispute()` — create dispute with `resolution: 'pending'`
  - `getDisputesByOrder()` — fetch disputes for an order

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type mismatch in orderFromDb mapper**
- **Found during:** Task 3 verification (`npx tsc --noEmit`)
- **Issue:** `escrow_status: (row.escrow_status as string)` was not assignable to `EscrowStatus | undefined`. Same for `payout_status_escrow`.
- **Fix:** Added `EscrowStatus` and `PayoutStatusEscrow` to the import in db.ts and used them directly in the cast expressions.
- **Files modified:** pwa/src/lib/db.ts
- **Commit:** 2d6ad76 (included in Task 3 commit)

## Known Stubs

None — all fields are wired to actual DB columns. No placeholder values or TODO markers.

## Out-of-Scope Issues Noted

- Pre-existing TypeScript error in `getTopWorkers()` (`Parameter 'w' implicitly has an 'any' type`) — present before this plan, not introduced by our changes. Logged for awareness; not fixed (out of scope).
- `@playwright/test` missing from worktree node_modules — pre-existing build environment issue.

## Self-Check: PASSED

- [x] supabase/migrations/006_escrow.sql exists
- [x] pwa/src/lib/types.ts exists and exports EscrowStatus, EscrowLedgerEntry, Dispute
- [x] pwa/src/lib/db.ts exists and exports insertEscrowLedger, getOrdersWithExpiringHolds, createDispute
- [x] Commit 179a0d3 exists (migration)
- [x] Commit 38536cc exists (types)
- [x] Commit 2d6ad76 exists (db.ts)
- [x] No CREATE TYPE in migration (uses TEXT + CHECK per constraint)
- [x] escrow_ledger.type column named 'type' (not 'event_type')
- [x] pg_cron schedule is '0 6 * * *' (09:00 MSK = 06:00 UTC)
- [x] pg_cron calls pg_net HTTP to /api/cron/capture-expired (not YooKassa directly)
- [x] workers has BOTH payout_card AND payout_card_synonym
