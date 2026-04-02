---
phase: quick
plan: 260402-mtc
subsystem: payout-routing
tags: [payout, orders, n8n, yookassa, migration]
dependency_graph:
  requires: [006_escrow.sql, 008_orders_markup.sql]
  provides: [010_payout_method.sql, payout_method routing in confirm route]
  affects: [pwa/src/app/api/orders/[id]/confirm/route.ts, pwa/src/lib/types.ts, pwa/src/lib/db.ts]
tech_stack:
  added: []
  patterns: [fire-and-forget fetch webhook, branched payout routing]
key_files:
  created:
    - supabase/migrations/010_payout_method.sql
  modified:
    - pwa/src/lib/types.ts
    - pwa/src/lib/db.ts
    - pwa/src/app/api/orders/[id]/confirm/route.ts
    - pwa/.env.example
decisions:
  - "payout_method defaults to 'manual_transfer' at DB level so existing orders behave correctly without migration"
  - "yookassa_payout branch preserves existing logic byte-for-byte"
  - "n8n webhook is fire-and-forget (fetch().catch()) to never block confirm response"
  - "pending_manual status distinguishes manual/cash payouts from auto-deferred 'pending'"
metrics:
  duration: "~10 min"
  completed: "2026-04-02"
  tasks_completed: 2
  files_changed: 4
---

# Quick Task 260402-mtc: Flexible Payout Methods Summary

**One-liner:** Added `payout_method` column to orders with SQL migration + branched confirm route — `yookassa_payout` keeps existing auto-payout, `manual_transfer`/`cash` fire n8n webhook and set `payout_status_escrow='pending_manual'`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration + types + db mapper for payout_method | cc8acbd | supabase/migrations/010_payout_method.sql, pwa/src/lib/types.ts, pwa/src/lib/db.ts |
| 2 | Branch payout logic in confirm route by payout_method | c38e3a4 | pwa/src/app/api/orders/[id]/confirm/route.ts, pwa/.env.example |

## What Was Built

### Migration (010_payout_method.sql)
- `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'manual_transfer' CHECK (payout_method IN ('yookassa_payout', 'manual_transfer', 'cash'))`
- Default is `manual_transfer` — existing orders behave as manual without any data migration

### Types (types.ts)
- `PayoutStatusEscrow` union extended with `'pending_manual'`
- `Order` interface gains `payout_method?: string`

### DB Mapper (db.ts)
- `orderFromDb` maps `payout_method` from DB row after `payout_id`

### Confirm Route (route.ts)
- Payout block replaced with branch on `payoutMethod = updated.payout_method || 'manual_transfer'`
- `yookassa_payout` branch: exact copy of original createPayout logic, zero modifications
- `manual_transfer`/`cash` branch:
  - Looks up worker name + phone for webhook payload
  - Fires `N8N_PAYOUT_WEBHOOK_URL` via fire-and-forget `fetch().catch()`
  - Sets `payout_status_escrow: 'pending_manual'`
  - Inserts escrow ledger entry `type='payout'` with note `Manual payout scheduled: {method}`

### .env.example
- Added `N8N_PAYOUT_WEBHOOK_URL=` under new `# ── n8n Webhooks ──` section

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The n8n webhook fires with real data (order_id, supplier_payout, worker_name, worker_phone). If `N8N_PAYOUT_WEBHOOK_URL` is not set, the webhook silently skips — the `pending_manual` status and ledger entry are still written correctly.

## Migrations to Apply in Supabase

- `010_payout_method.sql` — adds `payout_method TEXT DEFAULT 'manual_transfer'` to orders table

## Runtime Config Required

- `N8N_PAYOUT_WEBHOOK_URL` — n8n webhook URL that receives POST with payout details when payout_method is `manual_transfer` or `cash`. Optional: if unset, webhook is skipped silently.

## Self-Check: PASSED

- [x] `supabase/migrations/010_payout_method.sql` exists with ALTER TABLE + CHECK constraint
- [x] `PayoutStatusEscrow` includes `'pending_manual'` (pwa/src/lib/types.ts:2)
- [x] `Order` interface has `payout_method?: string` (pwa/src/lib/types.ts:49)
- [x] `orderFromDb` maps `payout_method` (pwa/src/lib/db.ts:54)
- [x] confirm route branches on `payoutMethod` (route.ts:118)
- [x] `yookassa_payout` branch contains original `createPayout` call (route.ts:130)
- [x] `manual_transfer`/`cash` branch fires n8n webhook fire-and-forget (route.ts:173-186)
- [x] `payout_status_escrow: 'pending_manual'` set in non-yookassa path (route.ts:189)
- [x] commit cc8acbd exists (Task 1)
- [x] commit c38e3a4 exists (Task 2)
