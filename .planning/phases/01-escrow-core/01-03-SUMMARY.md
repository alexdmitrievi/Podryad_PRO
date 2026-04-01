---
phase: 01-escrow-core
plan: "03"
subsystem: payments
tags: [yookassa, escrow, webhook, ip-verification, api-route, nextjs]

requires:
  - phase: 01-01
    provides: insertEscrowLedger, updateOrder, getOrderById in db.ts
  - phase: 01-02
    provides: createEscrowPayment in yukassa.ts

provides:
  - POST /api/payments/create-escrow endpoint (2-stage YooKassa payment creation)
  - Extended POST /api/payments/callback with escrow event handlers
  - IP whitelist verification for YooKassa webhooks
  - lib/yookassa-ip.ts utility module

affects: [01-04, 01-05]

tech-stack:
  added: []
  patterns:
    - "Next.js route files must only export HTTP handler functions; utilities in lib/"
    - "YooKassa IP whitelist verification (no HMAC) via CIDR bitmask matching"
    - "Escrow event routing: metadata.type='escrow' distinguishes escrow from non-escrow payments"
    - "Webhook always returns 200 OK to prevent YooKassa retry storms"

key-files:
  created:
    - pwa/src/app/api/payments/create-escrow/route.ts
    - pwa/src/lib/yookassa-ip.ts
    - pwa/src/app/api/payments/__tests__/webhook.test.ts
  modified:
    - pwa/src/app/api/payments/callback/route.ts

key-decisions:
  - "isYooKassaIP moved to lib/yookassa-ip.ts (not inline in route) because Next.js route files must only export HTTP handlers"
  - "Webhook returns 200 on IP rejection (not 403) to avoid YooKassa retry storms"
  - "Escrow vs non-escrow routing via metadata.type='escrow' check in payment.succeeded block"
  - "NODE_ENV='development' skips IP check for local development without extra env vars"

patterns-established:
  - "IP check at top of webhook handler before body parsing"
  - "Escrow event handler returns early after processing to avoid double-handling"

requirements-completed: []

duration: 7min
completed: 2026-04-01
---

# Phase 01 Plan 03: Payment API Routes Summary

**POST /api/payments/create-escrow creates 2-stage YooKassa holds with 10% service fee; webhook extended with IP whitelist verification and handlers for payment.waiting_for_capture, payment.succeeded (escrow), and payment.canceled**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-01T15:16:48Z
- **Completed:** 2026-04-01T15:22:54Z
- **Tasks:** 2
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- Created `POST /api/payments/create-escrow` that validates input, checks for duplicate payment (409), calculates 10% service fee and combo discount, calls `createEscrowPayment()` with `capture:false`, stores all financial fields on the order, and returns `confirmationUrl`
- Extended `POST /api/payments/callback` with IP whitelist verification (6 YooKassa CIDRs), `payment.waiting_for_capture` handler (sets `escrow_status='payment_held'`, inserts hold ledger), `payment.succeeded` escrow branch (sets `'completed'`, inserts capture ledger), and `payment.canceled` handler (sets `'cancelled'`, inserts release ledger)
- Created 12-test suite covering IP rejection, all 3 escrow events, and preservation of non-escrow `payment.succeeded` behavior

## Task Commits

1. **Task 1: POST /api/payments/create-escrow endpoint** - `db740aa` (feat)
2. **Task 2: Webhook escrow events + IP verification + tests** - `823efd7` (feat)
3. **Auto-fix: move isYooKassaIP to lib/yookassa-ip.ts** - `0dbdedd` (fix)

## Files Created/Modified

- `pwa/src/app/api/payments/create-escrow/route.ts` - Escrow payment creation endpoint; validates request, calculates fees, calls YooKassa, updates order
- `pwa/src/lib/yookassa-ip.ts` - YooKassa IP whitelist utility; CIDR bitmask matching for 6 IP ranges
- `pwa/src/app/api/payments/callback/route.ts` - Extended webhook with IP check + 3 escrow event handlers; preserves existing non-escrow logic
- `pwa/src/app/api/payments/__tests__/webhook.test.ts` - 12 unit tests (5 event tests + 7 isYooKassaIP tests), all passing

## Decisions Made

- `isYooKassaIP` extracted to `lib/yookassa-ip.ts` instead of staying inline in route: Next.js App Router generates `.next/types/app/...` type declarations that only allow HTTP handler exports from route files; a non-handler export causes TS2344.
- Webhook returns 200 on IP rejection to avoid triggering YooKassa's retry mechanism.
- `metadata.type === 'escrow'` check routes `payment.succeeded` to escrow path vs existing non-escrow path, preserving backward compatibility.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved isYooKassaIP to lib/yookassa-ip.ts**
- **Found during:** Task 2 verification (TypeScript check)
- **Issue:** Exporting `isYooKassaIP` from the route file caused `TS2344` in `.next/types/app/api/payments/callback/route.ts` — Next.js App Router expects route files to only export HTTP handlers
- **Fix:** Created `pwa/src/lib/yookassa-ip.ts` with the function; updated route to import from lib; updated test to import from lib
- **Files modified:** `pwa/src/lib/yookassa-ip.ts` (created), `pwa/src/app/api/payments/callback/route.ts`, `pwa/src/app/api/payments/__tests__/webhook.test.ts`
- **Verification:** `npx tsc --noEmit` passes with no source-file errors; all 12 tests still pass
- **Committed in:** `0dbdedd`

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: TypeScript export constraint from Next.js App Router)
**Impact on plan:** Essential correctness fix. No scope creep. Tests import from the correct location.

## Issues Encountered

None beyond the TS2344 auto-fix described above.

## Known Stubs

None — all routes wire real YooKassa API calls and DB updates.

## Next Phase Readiness

- Phase 01-04 can now build on `payment_held` state to implement confirm/dispute flow
- `POST /api/payments/create-escrow` is ready to be called from order flow (n8n/Telegram)
- Webhook is production-ready: IP-verified, handles all 3 escrow lifecycle events
- No blockers for 01-04

## Self-Check: PASSED

- FOUND: `pwa/src/app/api/payments/create-escrow/route.ts`
- FOUND: `pwa/src/app/api/payments/callback/route.ts`
- FOUND: `pwa/src/app/api/payments/__tests__/webhook.test.ts`
- FOUND: `pwa/src/lib/yookassa-ip.ts`
- FOUND: `.planning/phases/01-escrow-core/01-03-SUMMARY.md`
- Commit `db740aa` exists (Task 1: create-escrow route)
- Commit `823efd7` exists (Task 2: webhook + tests)
- Commit `0dbdedd` exists (auto-fix: yookassa-ip.ts)
- Commit `c3160d5` exists (docs: SUMMARY + STATE)
- All 12 tests passing

---
*Phase: 01-escrow-core*
*Completed: 2026-04-01*
