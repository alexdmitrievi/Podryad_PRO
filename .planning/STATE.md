---
phase: "01"
status: "active"
last_activity: "2026-04-01"
last_session_stopped_at: "Completed 01-03-PLAN.md (Payment API routes: create-escrow + webhook extension)"
---

# Project State

## Current Focus
Phase 01: escrow-core

## Current Position
Wave 2 — 01-03 and 01-04 complete, proceeding to 01-05

## Plan Progress
- [x] 01-01 DB migration + TypeScript types + db.ts mapper
- [x] 01-02 YooKassa escrow functions + confirmation JWT
- [x] 01-03 Payment API routes (create-escrow + webhook extension)
- [x] 01-04 Order API routes (confirm + dispute) + cron auto-capture
- [ ] 01-05 UI pages (pay, status, confirm) + env vars

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
