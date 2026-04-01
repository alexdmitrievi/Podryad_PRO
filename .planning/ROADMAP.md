# Подряд PRO — Roadmap

## Phase 1: Escrow Core
**Goal:** Реализовать безопасную сделку через YooKassa: двухстадийный платёж (hold + capture), подтверждение обеими сторонами, автовыплата исполнителю, эскроу-леджер, споры.

**Plans:** 5 plans

Plans:
- [x] 01-01-PLAN.md — DB migration (006_escrow.sql) + TypeScript types + db.ts mapper
- [x] 01-02-PLAN.md — YooKassa escrow functions (create/capture/cancel/payout) + confirmation JWT
- [x] 01-03-PLAN.md — Payment API routes (create-escrow + webhook extension)
- [x] 01-04-PLAN.md — Order API routes (confirm + dispute) + cron auto-capture
- [x] 01-05-PLAN.md — UI pages (pay, status, confirm) + env vars

**Scope:**
- Supabase migrations: обновить orders (subtotal/service_fee/combo_discount/total/payout), добавить escrow_ledger, disputes
- API: POST /api/payments/create-escrow (capture:false), extend /api/payments/callback, POST /api/orders/[id]/confirm, POST /api/orders/[id]/dispute
- Cron: авто-capture для заказов > 6 дней
- UI: страницы /order/[id]/pay, /order/[id]/status, /order/[id]/confirm (виджет двойного подтверждения)

**Canonical refs:**
- `pwa/src/lib/yukassa.ts` — существующая YooKassa интеграция
- `pwa/src/lib/db.ts` — паттерны запросов к БД
- `supabase/migrations/` — существующие миграции
- `supabase/schema.sql` — текущая схема

## Phase 2: Landing Page
**Goal:** Конверсионный лендинг (10 секций по спеку): Hero, SafeDeal, Calculator, Combo, Crews, Catalog-preview, How-it-works, Stats, For-executors, Footer.

## Phase 3: Unified Catalog
**Goal:** Единый каталог с линзами (labor/material/equipment), unified listings table, ListingCard, CategoryTabs.

## Phase 4: Crews & Brigades
**Goal:** Страница /crews, регистрация бригады, профиль бригады с crew_type в suppliers, приоритет в выдаче.

## Phase 5: Dashboard & Orders Flow
**Goal:** Личные кабинеты (заказчик + исполнитель), история заказов, рейтинги, выплаты.
