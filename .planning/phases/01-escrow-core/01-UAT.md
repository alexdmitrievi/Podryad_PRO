---
status: testing
phase: 01-escrow-core
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md
started: 2026-04-01T15:45:00Z
updated: 2026-04-01T15:45:00Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Kill any running dev server. Clear .next/ cache if present (rm -rf pwa/.next).
  Run: cd pwa && npm run dev
  The dev server should start without errors, Next.js should compile successfully, and
  visiting http://localhost:3000 should load the app homepage without a crash page.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Clear .next/ cache if present (rm -rf pwa/.next). Run: cd pwa && npm run dev. The dev server starts without errors, Next.js compiles successfully, and visiting http://localhost:3000 loads the app without a crash page.
result: [pending]

### 2. Escrow Pay Page Renders
expected: Visit http://localhost:3000/order/test-order-123/pay — the page should render a loading spinner briefly, then either show "Загрузка..." or a form to enter subtotal + phone (since test-order-123 doesn't exist in DB, an error/empty state is expected, but the page itself should render — not a 500 or blank white screen).
result: [pending]

### 3. Payment Status Polling UI
expected: Visit http://localhost:3000/order/test-order-123/status — the page should show a spinner with Russian text like "Ожидание подтверждения оплаты..." or similar. It should poll (you might see brief network requests in DevTools). After ~10 failed attempts it should settle into a final state (not crash).
result: [pending]

### 4. Confirm Page — Customer Role
expected: Visit http://localhost:3000/order/test-order-123/confirm?role=customer&token=dummy — the page should render the confirm layout. Since the token is invalid, it should show an error message (something like "Недействительная ссылка" or "Ошибка токена") — NOT a blank screen or unhandled exception. The page title/layout should be visible.
result: [pending]

### 5. Confirm Page — Supplier Role
expected: Visit http://localhost:3000/order/test-order-123/confirm?role=supplier&token=dummy — same as customer test: the page renders, shows an error about invalid token, but displays supplier-specific text or context (e.g., "Исполнитель" role label). Not a crash.
result: [pending]

### 6. Worker Profile — Card Binding Section
expected: Visit http://localhost:3000/worker/profile (you may need to be logged in as a worker). The page should show a card binding section with: current status "Карта не привязана" (or last 4 digits if already bound), and a button "Привязать карту" or "Изменить карту". Not a blank page.
result: [pending]

### 7. Payout Widget Fallback (No Env Key)
expected: On the worker profile page, if NEXT_PUBLIC_YUKASSA_PAYOUT_WIDGET_KEY is not set in pwa/.env.local, clicking the "Привязать карту" button should show "Привязка карты временно недоступна" instead of loading the widget. This is the graceful fallback for unconfigured environments.
result: [pending]

### 8. create-escrow API — Input Validation
expected: Run: curl -X POST http://localhost:3000/api/payments/create-escrow -H "Content-Type: application/json" -d '{}' — should return HTTP 400 with a JSON error (missing required fields like orderId, phone, subtotal), NOT a 500 or crash.
result: [pending]

### 9. Confirm API — JWT Validation Gate
expected: Run: curl -X POST http://localhost:3000/api/orders/test-order-123/confirm -H "Content-Type: application/json" -d '{"token":"invalid","role":"customer"}' — should return HTTP 401 (invalid token), not 500. The endpoint correctly rejects bad JWTs.
result: [pending]

### 10. Cron Endpoint — Secret Gate
expected: Run: curl http://localhost:3000/api/cron/capture-expired — should return HTTP 401 (missing or invalid cron secret). If you pass the correct secret via -H "x-cron-secret: <your-secret>", it should return 200 with {"processed":0,"total":0,"timestamp":"..."} (no orders to capture in test DB).
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps

[none yet]
