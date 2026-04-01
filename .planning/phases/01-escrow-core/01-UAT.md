---
status: complete
phase: 01-escrow-core
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md
started: 2026-04-01T15:45:00Z
updated: 2026-04-01T16:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Clear .next/ cache. Run: cd pwa && npm run dev. Server starts without errors, homepage loads without crash.
result: issue
reported: ".env.local has a non-standard NODE_ENV value (not 'development'). Running npm run dev from pwa/ causes 500 on all routes. Workaround: NODE_ENV=development npm run dev. Pre-existing env config issue, not introduced by Phase 1 code."
severity: minor

### 2. Escrow Pay Page Renders
expected: Visit /order/test-order-123/pay — renders loading state or form, not a blank/500 screen.
result: pass

### 3. Payment Status Polling UI
expected: Visit /order/test-order-123/status — shows spinner and Russian text "Ожидание подтверждения".
result: pass

### 4. Confirm Page — Customer Role
expected: Visit /order/test-order-123/confirm?role=customer&token=dummy — renders layout, shows error for invalid token (not a crash).
result: pass

### 5. Confirm Page — Supplier Role
expected: Visit /order/test-order-123/confirm?role=supplier&token=dummy — shows "Исполнитель" label and error for invalid token.
result: pass

### 6. Worker Profile — Card Binding Section
expected: Visit /worker/profile — shows card binding section with current status and bind/change button.
result: pass

### 7. Payout Widget Fallback (No Env Key)
expected: Without NEXT_PUBLIC_YUKASSA_PAYOUT_WIDGET_KEY configured, card binding shows "недоступна" fallback.
result: pass

### 8. create-escrow API — Input Validation
expected: POST /api/payments/create-escrow with empty body → 400 with validation error message.
result: pass

### 9. Confirm API — JWT Validation Gate
expected: POST /api/orders/test-order-123/confirm with invalid token → 401 "Invalid or expired confirmation token".
result: pass

### 10. Cron Endpoint — Secret Gate
expected: POST /api/cron/capture-expired without secret → 401. GET (health check) → 200 {"status":"ok"}.
result: pass

## Summary

total: 10
passed: 9
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Running 'npm run dev' from pwa/ starts the dev server cleanly without 500 errors"
  status: failed
  reason: "User reported: .env.local has non-standard NODE_ENV value. npm run dev causes 500 on all routes. Works with NODE_ENV=development npm run dev. Likely pre-existing env config, not Phase 1 code."
  severity: minor
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
