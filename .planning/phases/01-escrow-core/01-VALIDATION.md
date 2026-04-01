---
phase: 1
slug: escrow-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (already in pwa/) |
| **Config file** | `pwa/vitest.config.ts` |
| **Quick run command** | `cd pwa && npx vitest run --reporter=verbose 2>&1 | tail -20` |
| **Full suite command** | `cd pwa && npx vitest run 2>&1` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | What's tested | Test Type | Automated Command | Status |
|---------|------|------|---------------|-----------|-------------------|--------|
| 01-01-01 | 01 | 1 | Migration SQL syntax | file check | `ls supabase/migrations/006_escrow.sql` | ⬜ pending |
| 01-01-02 | 01 | 1 | yukassa.ts exports | grep | `grep -n "createEscrowPayment\|capturePayment\|createPayout" pwa/src/lib/yukassa.ts` | ⬜ pending |
| 01-02-01 | 02 | 2 | /api/payments/create-escrow exists | file check | `ls pwa/src/app/api/payments/create-escrow/route.ts` | ⬜ pending |
| 01-02-02 | 02 | 2 | webhook handles waiting_for_capture | grep | `grep "waiting_for_capture" pwa/src/app/api/payments/callback/route.ts` | ⬜ pending |
| 01-02-03 | 02 | 2 | /api/orders/[id]/confirm exists | file check | `ls "pwa/src/app/api/orders/[id]/confirm/route.ts"` | ⬜ pending |
| 01-03-01 | 03 | 3 | /order/[id]/confirm page exists | file check | `ls "pwa/src/app/order/[id]/confirm/page.tsx"` | ⬜ pending |
| 01-04-01 | 04 | 2 | pg_cron SQL in migration | grep | `grep "cron.schedule" supabase/migrations/006_escrow.sql` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `pwa/src/lib/__tests__/yukassa-escrow.test.ts` — unit tests for new escrow functions
- [ ] Existing vitest infrastructure covers all other tests

---

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|------------|-------------------|
| YooKassa capture:false actually holds funds | Requires live sandbox | Create test payment in sandbox, verify payment.waiting_for_capture event received |
| Both-party confirmation triggers capture | Requires two browser sessions | Open /confirm?role=customer, then /confirm?role=supplier, verify escrow_status=completed |
| pg_cron auto-capture fires | Requires time manipulation | Set payment_held_at to 6 days ago in DB, wait for cron, verify payment_captured=true |
| Payout Widget card collection | Requires YooKassa sandbox | Test payout widget flow end-to-end |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
