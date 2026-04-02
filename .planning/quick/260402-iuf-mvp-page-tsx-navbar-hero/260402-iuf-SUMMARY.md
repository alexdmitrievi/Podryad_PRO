---
quick-task: 260402-iuf
subsystem: pwa/landing
tags: [landing, navbar, hero, ui, mvp]
key-files:
  modified:
    - pwa/src/app/page.tsx
    - pwa/src/app/layout.tsx
    - pwa/src/components/StickyHeader.tsx
decisions:
  - StickyHeader suppressed on / to allow page.tsx inline navbar
  - Space Grotesk added to layout font loading (subsets: latin only — no cyrillic required for latin-only font)
  - All prices hardcoded in page.tsx constants — not from DB
  - Lead form is a stub with id=lead-form + Telegram/MAX messenger fallback
metrics:
  duration: "24m"
  completed: "2026-04-02"
  tasks: 3
  files: 3
---

# Quick Task 260402-iuf: MVP Landing Page (page.tsx — navbar + hero)

**One-liner:** Complete MVP landing page rewrite with inline navbar (logo + CTA), hero, 7 content sections, lead-form stub, using primary #2d35a8 / accent #f5a623 / Space Grotesk.

## What Was Built

Replaced the existing complex multi-component `page.tsx` (which imported AnimatedCounter, ScrollReveal, SafeDealSection, ComboOfferBanner, etc.) with a self-contained, dependency-free MVP landing page.

### Sections (in order)

1. **Navbar** (fixed) — logo "★ Подряд PRO" + [Оставить заявку] button scrolling to `#lead-form`
2. **Hero** — heading, subheading, CTA buttons (to `#lead-form` + catalog), stats row (100+ / 4.9 / 15 мин)
3. **Features** — 4-card grid: исполнители, отклик, оплата, техника
4. **How It Works** — 4 step list, step 4 gets accent color marker
5. **Pricing Preview** — 4 price cards (hardcoded: 650₽/ч, 18 500₽/смена, 3 200₽/сут, 5 800₽/м³) on brand background
6. **Safe Deal** — esrow explanation + 3 pillars (оплата, эскроу, арбитраж)
7. **For Executors** — dark brand card with free-for-self-employed CTA
8. **Lead Form Stub** (`id="lead-form"`) — placeholder with Telegram + MAX messenger links via env vars
9. **Footer** — logo, Telegram/MAX links, 3-column links grid

### Supporting Changes

- `layout.tsx`: Added `Space_Grotesk` from `next/font/google`, injected `${spaceGrotesk.variable}` into `<html>` className
- `StickyHeader.tsx`: Added `if (pathname === '/') return null;` guard so global header doesn't double-render on the landing page

## Decisions Made

- **StickyHeader suppression on `/`** — The global StickyHeader (used on all inner pages) renders at layout level. The landing has its own minimal inline navbar as required. Rather than refactoring layout, the simplest correct approach is the `pathname === '/'` guard already used for `/auth`.
- **No external component imports** — Old page.tsx imported ~10 heavy components. New page is fully self-contained (only `Link` from next/link). Eliminates all potential import errors on fresh dev builds.
- **Space Grotesk font** — Added to layout for proper font loading. Page uses inline `style={{ fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" }}` as the font family declaration (avoids needing tailwind config change).
- **Hardcoded prices** — Constraint specified "all prices on landing are hardcoded static values (not from DB)". PRICES constant at top of file.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as described in the constraints.

### Deviation: Space Grotesk font added to layout.tsx

- **Rule 2 (missing critical functionality):** Without loading the font in layout, the `fontFamily` style would silently fall back to Inter on all users. Added `Space_Grotesk` import + variable to ensure the font is actually served.
- **Files modified:** `pwa/src/app/layout.tsx`

## Known Stubs

| File | Location | Description |
|------|----------|-------------|
| `pwa/src/app/page.tsx` | `#lead-form` section | Lead form is a placeholder ("Форма заявки — скоро") with Telegram/MAX links. Intentional per constraints. Future plan (Phase 02b) should implement the actual form. |

## Self-Check

- [x] `pwa/src/app/page.tsx` exists and has correct content (12/12 content checks passed)
- [x] `pwa/src/app/layout.tsx` includes Space_Grotesk
- [x] `pwa/src/components/StickyHeader.tsx` has `pathname === '/'` guard
- [x] Commit `b65d950` exists: `feat(260402-iuf): MVP landing page — navbar, hero, 7 sections, lead-form stub`

## Self-Check: PASSED