---
id: 260402-jon
type: quick
title: Leads capture pipeline — migration + API + LeadForm
completed: 2026-04-02
duration: "3 minutes"
tasks_completed: 4
tasks_total: 4
files_created: 4
files_modified: 1
commits:
  - "3b348d1 feat(jon): add 009_leads.sql migration"
  - "5636399 feat(jon): add POST /api/leads endpoint"
  - "1c8d017 feat(jon): add LeadForm client component"
  - "0dc6919 feat(jon): wire LeadForm into landing page (section 9.8)"
key_files_created:
  - supabase/migrations/009_leads.sql
  - pwa/src/app/api/leads/route.ts
  - pwa/src/components/landing/LeadForm.tsx
key_files_modified:
  - pwa/src/app/page.tsx
tags: [leads, landing, form, migration, api, n8n]
---

# Quick Task 260402-jon: Leads Capture Pipeline

## One-liner
Full lead capture pipeline: Supabase `leads` table + `POST /api/leads` with n8n webhook + `LeadForm` pill-chip client component wired into landing page as `section#lead-form`.

## What Was Built

### 1. DB Migration (009_leads.sql)
- `leads` table: `id BIGSERIAL`, `phone TEXT`, `work_type TEXT`, `city TEXT DEFAULT 'omsk'`, `comment TEXT`, `source TEXT DEFAULT 'landing'`, `created_at TIMESTAMPTZ DEFAULT now()`
- RLS enabled, `service_role` policy only (no public access)
- Indexes on `created_at DESC` and `phone` for admin queries and deduplication

### 2. POST /api/leads
- Phone validation: strips all non-digits, requires 10+ digits
- Work type validation: enum `labor | equipment | materials | complex`
- Inserts via `getServiceClient()` (service key, bypasses RLS)
- Fire-and-forget n8n webhook: reads `N8N_LEADS_WEBHOOK_URL` env var, `fetch().catch()` — never blocks the 201 response
- Returns `{ ok: true }` on success, `{ error: "..." }` on validation/DB error

### 3. LeadForm (client component)
- `'use client'` directive — page.tsx stays a server component
- Work type: 4 pill/chip buttons (styled, not native radio inputs) — active state `bg-[#2d35a8]`
- Phone: `<input type="tel">` with live validation on submit
- Comment: optional `<textarea>` (2 rows)
- Inline success state: `CheckCircle2` SVG icon (Lucide), success text includes `+7-913-669-16-65` as clickable `tel:` link
- Error state: red border + red message below phone field
- Loading state: disabled inputs + button text "Отправляем..."

### 4. Landing page integration
- Import added to `page.tsx`
- New `section#lead-form` placed between SuppliersSection and Final CTA (Section 9.8)
- Section heading: "Получите предложение за 15 минут"

## Deviations from Plan

None — plan executed exactly as specified in constraints.

## Known Stubs

None — all data flows are wired. `N8N_LEADS_WEBHOOK_URL` is optional (webhook only fires if set).

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `supabase/migrations/009_leads.sql` | FOUND |
| `pwa/src/app/api/leads/route.ts` | FOUND |
| `pwa/src/components/landing/LeadForm.tsx` | FOUND |
| `pwa/src/app/page.tsx` (modified) | FOUND |
| Commit 3b348d1 (migration) | FOUND |
| Commit 5636399 (API route) | FOUND |
| Commit 1c8d017 (LeadForm) | FOUND |
| Commit 0dc6919 (page.tsx wired) | FOUND |
