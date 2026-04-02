---
phase: "06"
status: "in-progress"
last_activity: "2026-04-02"
last_session_stopped_at: "Completed quick task 260402-njk: Rewrite pwa/src/app/page.tsx — full landing page replacement"
---

# Project State

## Current Focus
Phase 02: markup pricing engine + landing page completion

## Current Position
Phase 01 complete — all 5 escrow plans executed.
Phase 02 started — migration 007_markup.sql DONE, 6 tasks remaining.

## Plan Progress
- [x] 01-01 DB migration + TypeScript types + db.ts mapper
- [x] 01-02 YooKassa escrow functions + confirmation JWT
- [x] 01-03 Payment API routes (create-escrow + webhook extension)
- [x] 01-04 Order API routes (confirm + dispute) + cron auto-capture
- [x] 01-05 UI pages (pay, status, confirm) + env vars
- [x] 02-00 supabase/migrations/007_markup.sql — markup_rates table, listings base_price/display_price, orders customer_total/supplier_payout/platform_margin
- [x] 02-01 lib/pricing.ts — getMarkupRate, applyMarkup, calculateOrderTotals
- [x] 02-02 lib/types.ts — add customer_total, supplier_payout, platform_margin, order_number to Order; add Listing type
- [x] 02-03 lib/yukassa.ts — single-line receipt (full_prepayment), use customerTotal
- [x] 02-04 lib/db.ts — map new Order fields in orderFromDb
- [x] 02-05 api/payments/create-escrow/route.ts — use customer_total, remove SERVICE_FEE_RATE
- [x] 02-06 api/orders/[id]/confirm/route.ts — use supplier_payout for payout + ledger

## Critical Business Decision: Monetization Model (Variant B — Hidden Markup)

**DECIDED: No visible "service fee". Margin is baked into price.**

How it works:
- Supplier sets base_price (e.g. 500 ₽/hr)
- Platform adds markup (e.g. +15%) → display_price (575 ₽/hr)
- Customer sees ONLY display_price — no "service fee" line
- Customer pays customer_total (sum of display prices)
- Supplier receives supplier_payout (sum of base prices = 100% of their rate)
- Platform keeps platform_margin (difference)

Default markups by category:
- labor: 15%, crews: 18%
- material: 7%, concrete: 5%
- equipment_rental: 12%
- heavy_machinery: 10%

Visibility rules:
- Customer sees: display_price, customer_total. NEVER base_price, markup_percent, platform_margin.
- Supplier sees: base_price, supplier_payout. NEVER customer_total, display_price of own listings, markup.
- Admin sees: everything.

YooKassa receipt: ONE line item with customer_total. No "service fee" line.
Payout to supplier: supplier_payout (not customer_total).

Combo discount 15%: applies when ≥2 different listing_types in order. Capped so platform_margin stays ≥3% of supplier_payout.

Platform is FREE for suppliers/crews. Forever. No commissions, no subscriptions.

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
- MONETIZATION: Hidden markup (Variant B) — no visible service fee, margin baked into display_price. Decided 2026-04-02.

## Completed Phases
- Phase 01: Escrow Core ✅
- Phase 02: Pricing Engine (lib/pricing.ts, types, yukassa, db, routes) ✅
- Phase 04 (Catalog): /catalog/*, /api/listings, 007_catalog.sql ✅
- Phase 06 (Orders + Dashboards): /order/new, /api/orders/place, /dashboard/customer, /dashboard/supplier, 008_orders_markup.sql ✅

## Remaining Phases
- Phase 02b: Landing Page (/page.tsx — 10 sections)
- Phase 04b: Supplier profiles + crews (/crews, /join, /join/crew)
- Phase 06b: Static pages (/pricing, /self-employed) + admin

## Migrations to Apply in Supabase
- 007_catalog.sql — listing_type, display_price, images, rating, orders_count
- 008_orders_markup.sql — markup_rates table, orders: customer_total/supplier_payout/supplier_id/order_items/order_number trigger

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260402-iuf | MVP лендинг: статичный page.tsx с navbar, Hero, Рабочая сила, Аренда техники, Стройматериалы, Безопасная сделка, Для исполнителей, форма-заглушка | 2026-04-02 | b70a446 | [260402-iuf-mvp-page-tsx-navbar-hero](./quick/260402-iuf-mvp-page-tsx-navbar-hero/) |
| 260402-jon | Форма заявки: leads migration + POST /api/leads + LeadForm компонент в лендинге + n8n webhook | 2026-04-02 | a907edc | [260402-jon-leads-migration-post-api-leads-leadform-](./quick/260402-jon-leads-migration-post-api-leads-leadform-/) |
| 260402-mtc | Гибкие выплаты: payout_method в orders + ветка confirm/route.ts для manual_transfer и cash + n8n уведомление | 2026-04-02 | 47ce840 | [260402-mtc-payout-method-orders-confirm-route-ts-ma](./quick/260402-mtc-payout-method-orders-confirm-route-ts-ma/) |
| 260402-njk | Rewrite pwa/src/app/page.tsx — full landing page replacement | 2026-04-02 | bb91ce2 | [260402-njk-rewrite-pwa-src-app-page-tsx-full-landin](./quick/260402-njk-rewrite-pwa-src-app-page-tsx-full-landin/) |
