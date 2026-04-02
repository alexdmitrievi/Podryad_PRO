---
id: 260402-jon
type: quick
title: Leads — migration + POST /api/leads + LeadForm
created: 2026-04-02
---

# Quick Task: Leads capture pipeline

## Objective
Add a full lead capture pipeline: DB table → API endpoint → landing page form.

## Tasks

1. `supabase/migrations/009_leads.sql` — leads table (phone, work_type, city, comment, source, created_at). RLS: service_role only.
2. `POST /api/leads` — validate phone (10+ digits), validate work_type enum, insert to leads, fire-and-forget n8n webhook.
3. `LeadForm` client component — pill/chip work_type selector, phone input, optional comment, inline success state.
4. Wire `<LeadForm />` into `page.tsx` as section#lead-form before Final CTA.

## Constraints
- Migration: 009 (NOT 008, already taken)
- Webhook: fire-and-forget fetch().catch() — never blocks API response
- LeadForm: 'use client', page.tsx stays server component
- Radio UI: styled pill buttons (not native radio inputs visually)
- Primary: #2d35a8, Accent: #f5a623
- Success: inline, CheckCircle2 SVG, text includes phone +7-913-669-16-65
- Phone validation: strip non-digits, require 10+ digits
- No emojis as icons
