# Подряд PRO — Roadmap

## Phase 1: Escrow Core
**Goal:** Реализовать безопасную сделку через YooKassa: двухстадийный платёж (hold + capture), подтверждение обеими сторонами, автовыплата исполнителю, эскроу-леджер, споры.

**Scope:**
- Supabase migrations: обновить orders (subtotal/service_fee/combo_discount/total/payout), добавить order_items, escrow_ledger, disputes, ENUM типы
- API: POST /api/payments/create (capture:false), POST /api/webhooks/yookassa, POST /api/orders/[id]/confirm, POST /api/orders/[id]/dispute
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
