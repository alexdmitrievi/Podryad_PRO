---
phase: "01"
status: "active"
last_activity: "2026-04-01"
last_session_stopped_at: "Completed 01-02-PLAN.md (YooKassa escrow functions + confirmation JWT)"
---

# Project State

## Current Focus
Phase 01: escrow-core

## Current Position
Wave 1 — 01-02 complete, proceeding to 01-03

## Plan Progress
- [x] 01-01 DB migration + TypeScript types + db.ts mapper
- [x] 01-02 YooKassa escrow functions + confirmation JWT
- [ ] 01-03 Payment API routes (create-escrow + webhook extension)
- [ ] 01-04 Order API routes (confirm + dispute) + cron auto-capture
- [ ] 01-05 UI pages (pay, status, confirm) + env vars

## Decisions
- DB: Add escrow columns to existing orders table (non-breaking)
- Confirm UX: Both parties via PWA with JWT tokens
- Cron: Supabase pg_cron → /api/cron/capture-expired → YooKassa
- Payout identity: Add payout_card_synonym to workers table
