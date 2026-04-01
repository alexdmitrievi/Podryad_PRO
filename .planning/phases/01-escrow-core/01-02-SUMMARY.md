---
phase: "01"
plan: "02"
subsystem: "payment-library"
tags: ["yukassa", "escrow", "jwt", "tdd", "typescript"]
dependency_graph:
  requires: ["01-01"]
  provides: ["createEscrowPayment", "capturePayment", "cancelPayment", "createPayout", "signConfirmationToken", "verifyConfirmationToken"]
  affects: ["01-03", "01-04"]
tech_stack:
  added: []
  patterns: ["TDD RED-GREEN", "HS256 JWT escrow tokens", "2-stage YooKassa payment", "separate payout credentials"]
key_files:
  created:
    - pwa/src/lib/__tests__/yukassa-escrow.test.ts
    - pwa/src/lib/__tests__/escrow-confirm-token.test.ts
  modified:
    - pwa/src/lib/yukassa.ts
    - pwa/src/lib/auth.ts
decisions:
  - "Payout credentials read at function call time (not module load) to allow graceful degradation when agent contract not signed"
  - "createEscrowPayment metadata.type='escrow' added to distinguish from VIP/rental payments in webhook handler"
  - "verifyConfirmationToken checks role is exactly 'customer' or 'supplier' (not other roles)"
metrics:
  duration: "~4 minutes"
  completed_at: "2026-04-01T15:13:27Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
  tests_added: 16
  tests_passed: 16
---

# Phase 01 Plan 02: YooKassa Escrow Functions + Confirmation JWT Summary

**One-liner:** YooKassa 2-stage payment (capture:false) with 54-FZ receipt + HS256 escrow confirmation JWT reusing existing auth.ts HMAC pattern.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extend yukassa.ts with escrow payment, capture, cancel, payout | `1a46692` | yukassa.ts (+4 functions), yukassa-escrow.test.ts (9 tests) |
| 2 | Add confirmation JWT functions to auth.ts | `2648b51` | auth.ts (+2 functions), escrow-confirm-token.test.ts (7 tests) |

## What Was Built

### yukassa.ts additions (4 new exports)

- `createEscrowPayment()` — Creates a 2-stage payment with `capture: false`. Includes a 2-line fiscal receipt per 54-FZ: line 1 = subtotal (work performed), line 2 = service fee. Receipt uses `tax_system_code: 2` (USN Dohody) and `vat_code: 1` (no VAT). Metadata includes `type: 'escrow'` to distinguish from VIP/rental payments in the webhook.

- `capturePayment()` — POSTs to `/payments/{id}/capture` with `Idempotence-Key` header. Empty body (full capture of held amount). Uses same Basic Auth as shop payments.

- `cancelPayment()` — POSTs to `/payments/{id}/cancel`. Returns funds to payer card.

- `createPayout()` — Uses separate `YUKASSA_PAYOUT_AGENT_ID` + `YUKASSA_PAYOUT_SECRET` credentials (not shop keys). Calls `payouts.yookassa.ru/v3/payouts`. Accepts `cardSynonym` from the YooKassa Payout Widget (PCI DSS compliant — no raw card numbers stored). Credentials read at call time (not module load) to allow graceful degradation when the payouts agent contract is not yet signed.

### auth.ts additions (2 new exports)

- `signConfirmationToken()` — Produces an HS256 JWT with `purpose: 'escrow_confirm'`, `orderId`, `role` ('customer' | 'supplier'), `sub` (phone), and `exp` = now + 86400s (24h). Reuses `base64UrlEncodeJson`, `base64UrlEncodeBuffer`, and `createHmac` helpers already present in auth.ts.

- `verifyConfirmationToken()` — Verifies signature with `timingSafeEqual`, checks expiry, validates `purpose === 'escrow_confirm'` (prevents cross-use with session tokens), and checks required fields. Returns `ConfirmationTokenPayload` or `null`.

## Test Results

| Test File | Tests | Result |
|-----------|-------|--------|
| yukassa-escrow.test.ts | 9 | All pass |
| escrow-confirm-token.test.ts | 7 | All pass |
| All lib tests combined | 41 | All pass (no regression) |

## Deviations from Plan

None - plan executed exactly as written.

The plan specified reading payout credentials "inside the function" to allow graceful degradation. This was implemented as specified and counted as a plan-defined pattern, not a deviation.

## Known Stubs

None. Both files contain production-ready implementations with no placeholder values or hardcoded stubs.

## Self-Check: PASSED

Files created/modified:
- FOUND: pwa/src/lib/yukassa.ts
- FOUND: pwa/src/lib/auth.ts
- FOUND: pwa/src/lib/__tests__/yukassa-escrow.test.ts
- FOUND: pwa/src/lib/__tests__/escrow-confirm-token.test.ts

Commits verified:
- FOUND: 1a46692 (feat(01-02): add escrow payment, capture, cancel, payout to yukassa.ts)
- FOUND: 2648b51 (feat(01-02): add signConfirmationToken and verifyConfirmationToken to auth.ts)

TypeScript: npx tsc --noEmit passes (no output = clean)
Tests: 16/16 pass in escrow-specific files, 41/41 pass across all lib tests
