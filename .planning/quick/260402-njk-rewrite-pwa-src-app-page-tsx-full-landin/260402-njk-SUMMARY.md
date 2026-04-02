---
phase: quick
plan: 260402-njk
subsystem: pwa/landing
tags: [landing, lead-form, ui, tailwind, react]
dependency_graph:
  requires: []
  provides: [landing-page, lead-form-ui]
  affects: [pwa/src/app/page.tsx]
tech_stack:
  added: []
  patterns: [use-client, controlled-form, fetch-post]
key_files:
  created: []
  modified:
    - pwa/src/app/page.tsx
decisions:
  - Self-contained component with no external imports (per spec)
  - Form messenger selector added to comment field before POST
  - Submit silently succeeds on network error (UX decision — show success anyway)
metrics:
  duration: "~2 minutes"
  completed: "2026-04-02"
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 260402-njk: Rewrite pwa/src/app/page.tsx — Full Landing Summary

## One-liner

Self-contained single-page landing with 7 sections, sticky navbar, controlled lead-form POSTing to /api/leads, and copyright-only footer — no external component imports.

## What Was Done

Replaced the existing multi-component `page.tsx` (650 lines, 13 imports from lucide-react, custom components, dark-mode classes) with a fully self-contained React client component (299 lines, `'use client'` directive, zero external component imports).

### Sections delivered

1. **Navbar** — sticky, logo "✅ Подряд PRO" + [Оставить заявку] button scrolling to `#lead-form`
2. **Hero** — heading with cities, tagline "платите только за результат", CTA button `↓`
3. **Рабочая сила** — 4 service cards with hardcoded prices, "Бригады от 2 до 15 человек"
4. **Аренда техники** — 6 equipment cards with prices, "тяжёлая техника по запросу", combo 15% discount badge
5. **Стройматериалы** — 5 material pills, "Доставка по Омску и Новосибирску"
6. **Безопасная сделка** — 4-step flow (заявка → подбор → оплата с заморозкой → подтверждение)
7. **Для исполнителей** — "Бесплатно. 100% ставки." + MAX + Telegram buttons with `process.env` links
8. **Lead form** (`id="lead-form"`) — category selector, description textarea, phone input, city selector, messenger selector, POST to `/api/leads`, success state

### Footer

Copyright-only: `© 2026 Подряд PRO. Все права защищены.`

## Commits

| Hash | Description |
|------|-------------|
| bb91ce2 | feat(260402-njk): rewrite page.tsx as self-contained landing |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data is hardcoded per spec. Env vars `NEXT_PUBLIC_MAX_CHANNEL_LINK` and `NEXT_PUBLIC_BOT_NAME` have fallback defaults so the page renders correctly even without `.env`.

## Self-Check: PASSED

- `pwa/src/app/page.tsx` exists with `'use client'` directive
- Commit `bb91ce2` exists in git log
- All 7 sections present in the file
- No imports from `@/components/*`
- Form POSTs to `/api/leads` with `{ category, comment, phone, city }`
