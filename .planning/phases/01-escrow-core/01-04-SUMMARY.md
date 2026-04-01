---
phase: "01"
plan: "04"
subsystem: "escrow-api-routes"
tags: ["escrow", "confirmation", "dispute", "cron", "yookassa"]
dependency_graph:
  requires: ["01-01", "01-02"]
  provides: ["confirm-endpoint", "dispute-endpoint", "cron-capture-endpoint"]
  affects: ["01-05"]
tech_stack:
  added: []
  patterns: ["Next.js 15 async params", "idempotent-confirmation", "both-party-escrow", "cron-secret-auth"]
key_files:
  created:
    - pwa/src/app/api/orders/[id]/confirm/route.ts
    - pwa/src/app/api/orders/[id]/dispute/route.ts
    - pwa/src/app/api/cron/capture-expired/route.ts
  modified: []
decisions:
  - "Idempotent double-confirm returns 200 already_confirmed (not 4xx) to handle retries gracefully"
  - "Capture errors in confirm route are non-blocking — YooKassa webhook will reconcile"
  - "Cron route supports both x-cron-secret and Authorization Bearer for pg_net compatibility"
  - "Payout deferred (payout_status_escrow=pending) when YUKASSA_PAYOUT_AGENT_ID not configured"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-01"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 0
---

# Phase 01 Plan 04: Order Confirmation, Dispute, and Cron Auto-Capture Summary

**One-liner:** Three escrow API routes completing the lifecycle: JWT-verified both-party confirm triggers YooKassa capturePayment + createPayout, dispute endpoint locks order as 'disputed', and cron route auto-captures 6-day-old payment holds with secret validation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | POST /api/orders/[id]/confirm route | 798a0db | pwa/src/app/api/orders/[id]/confirm/route.ts |
| 2 | POST /api/orders/[id]/dispute + GET+POST /api/cron/capture-expired | a8e0f2f | pwa/src/app/api/orders/[id]/dispute/route.ts, pwa/src/app/api/cron/capture-expired/route.ts |

## What Was Built

### POST /api/orders/[id]/confirm

- Parses Next.js 15 async params: `const { id } = await context.params`
- Validates request body: `token` (string) + `role` ('customer' | 'supplier')
- Verifies JWT via `verifyConfirmationToken` (HS256, 24h expiry, purpose='escrow_confirm')
- Cross-checks `payload.orderId === id && payload.role === role`
- Checks `escrow_status` is in `['payment_held', 'in_progress', 'pending_confirm']`
- Idempotent: if already confirmed for that role, returns `{ status: 'already_confirmed', role }`
- Sets `customer_confirmed` or `supplier_confirmed` with timestamp
- Re-fetches to check both confirmed, then:
  - Sets `escrow_status = 'completed'`
  - Calls `capturePayment(paymentId, captureKey)` (non-blocking on error)
  - Inserts `escrow_ledger` entry `type='capture'`
  - If `YUKASSA_PAYOUT_AGENT_ID` configured: looks up worker by `executor_id`, uses `payout_card_synonym` for `createPayout()`
  - Inserts `escrow_ledger` entry `type='payout'`
  - Graceful degradation: sets `payout_status_escrow='pending'` when payout not configured

### POST /api/orders/[id]/dispute

- Validates `initiatedBy` ('customer' | 'supplier') and `reason` (non-empty string)
- Returns 404 if order not found
- Returns 409 if `escrow_status` is 'completed' or 'cancelled'
- Creates dispute record via `createDispute()` with `resolution='pending'`
- Updates order: `escrow_status = 'disputed'`
- Returns 201 with `{ disputeId, status: 'disputed' }`

### POST /api/cron/capture-expired + GET (health check)

- `verifyCronSecret()` checks both:
  - `Authorization: Bearer <CRON_SECRET>`
  - `x-cron-secret: <CRON_SECRET>` (pg_net compatibility)
- Returns 401 if secret missing or invalid
- Fetches orders via `getOrdersWithExpiringHolds()` (escrow_status='payment_held', payment_captured=false, held >6 days)
- For each order: captures payment, updates order (payment_captured=true, escrow_status='completed'), inserts ledger entry with note 'Auto-captured by cron (6-day expiry)'
- Per-order errors are caught and logged — one failure does not block others
- Returns `{ processed, total, timestamp }`
- GET handler returns `{ status: 'ok' }` for health checks

## Decisions Made

1. **Idempotent double-confirm:** Returns `200 { status: 'already_confirmed' }` instead of 4xx to handle network retries from notification links without user-facing errors.

2. **Non-blocking capture errors:** `capturePayment` errors in the confirm route are caught and logged but don't return 500. YooKassa sends a webhook when the payment is actually captured, providing eventual consistency.

3. **Dual cron auth header:** Supports both `x-cron-secret` (pg_cron via pg_net) and `Authorization: Bearer` (Vercel cron, external schedulers) for flexibility.

4. **Payout graceful degradation:** When `YUKASSA_PAYOUT_AGENT_ID` is not configured, sets `payout_status_escrow='pending'` and logs a warning. This allows testing the confirm flow before the payouts agent contract is signed.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all three routes are fully wired with real DB and YooKassa calls.

## Self-Check: PASSED

Files verified:
- FOUND: pwa/src/app/api/orders/[id]/confirm/route.ts
- FOUND: pwa/src/app/api/orders/[id]/dispute/route.ts
- FOUND: pwa/src/app/api/cron/capture-expired/route.ts

Commits verified:
- FOUND: 798a0db (feat(01-04): create POST /api/orders/[id]/confirm route)
- FOUND: a8e0f2f (feat(01-04): create dispute route and cron auto-capture route)

TypeScript: `npx tsc --noEmit` — zero errors in project source files (pre-existing framework-level errors in .next/types excluded)
