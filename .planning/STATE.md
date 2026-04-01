---
phase: "02"
status: "planning"
last_activity: "2026-04-01T19:30:00Z"
last_session_stopped_at: "Completed discuss-phase 2 — 02-CONTEXT.md written, ready for /gsd:plan-phase 2"
---

# Project State

## Current Focus
Phase 02: landing-page

## Current Position
Phase 01 complete — all 5 plans executed (01-01 through 01-05)

## Plan Progress
- [x] 01-01 DB migration + TypeScript types + db.ts mapper
- [x] 01-02 YooKassa escrow functions + confirmation JWT
- [x] 01-03 Payment API routes (create-escrow + webhook extension)
- [x] 01-04 Order API routes (confirm + dispute) + cron auto-capture
- [x] 01-05 UI pages (pay, status, confirm) + env vars

## Decisions
- DB: Add escrow columns to existing orders table (non-breaking)
- Confirm UX: Both parties via PWA with JWT tokens
- Cron: Supabase pg_cron → /api/cron/capture-expired → YooKassa
- Payout identity: Add payout_card_synonym to workers table
- Idempotent confirm: double-confirm returns 200 already_confirmed (not 4xx)
- Non-blocking capture: capturePayment errors don't block confirm response (webhook reconciles)
- Cron auth: supports both x-cron-secret (pg_net) and Authorization Bearer headers
- isYooKassaIP in lib/yookassa-ip.ts (not route.ts): Next.js route files must only export HTTP handlers
- Webhook returns 200 on IP rejection: prevents YooKassa retry storms
- Escrow routing via metadata.type='escrow': distinguishes escrow from non-escrow in payment.succeeded
- .env.example placed in pwa/ (not project root): project root has permission restrictions; pwa/ is Next.js app root anyway
- Worker profile page stub: payout_card not returned by existing /api/workers/profile route; card defaults to unbound on load; future plan should extend that route
