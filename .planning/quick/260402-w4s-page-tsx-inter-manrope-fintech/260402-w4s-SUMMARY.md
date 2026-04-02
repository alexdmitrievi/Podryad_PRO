# Quick Task 260402-w4s: Page.tsx Full Redesign per Brand Book

**Status:** Complete
**Date:** 2026-04-02

## What was done

Complete rewrite of `pwa/src/app/page.tsx` with strict brand-book compliance:

### Color Migration
- Replaced ALL orange/gold (#f5a623, #e09510) with blue palette
- Primary: brand-500 (#2F5BFF) for buttons, links, accents
- Dark: brand-900 (#1E2A5A) for hero, dark sections, footer
- Light Blue: #4DA3FF for hover states
- Violet: #6C5CE7 for gradient accents and materials card
- Zero occurrences of any orange/gold color in the file

### Typography
- All headings use `font-heading` class (Manrope)
- Body text uses `font-sans` (Inter) — default from layout.tsx
- Font sizes: large, readable, fintech-style

### Sections Implemented
1. **Navbar** — sticky white, logo via next/image from /public/logo.png + "Подряд PRO" text, blue CTA button
2. **Hero** — gradient from-brand-900 to-brand-500, all white text (no orange span), counters, noise overlay
3. **Services** — 3 cards (Рабочая сила hardcoded, Аренда/Материалы fetched), blue/violet accents
4. **Безопасная сделка** — 4 steps on brand-900 bg, blue-to-violet gradient step circles
5. **Для исполнителей** (NEW) — blue-to-violet gradient, MAX + Telegram buttons
6. **Lead form** — white card, all blue buttons, 152-ФЗ checkbox, /privacy link
7. **Footer** — brand-900 bg, ИП Жбанков А.Д. ИНН 550516401202
8. **Sticky mobile CTA** — blue button

### Preserved
- All hooks: useFetchListings, useReveal, useCountUp
- All types: WorkType, City, Messenger, Listing
- All form state and handleSubmit logic
- API integration: /api/listings/public, /api/leads

### Style
- Buttons: rounded-[10px]
- Cards: rounded-xl, shadow-card, hover:shadow-card-hover
- fintech/SaaS clean design — no decoration, no chaos

## Verification
- `grep -c "f5a623|orange|gold"` → 0
- `npx next build` → success
- next/image import present
- "Для исполнителей" section present
- 10 font-heading usages, 27 brand-500/brand-900 usages
