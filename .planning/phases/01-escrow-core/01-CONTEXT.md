# Phase 1: Escrow Core — Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Реализовать безопасную сделку через YooKassa: двухстадийный платёж (hold → подтверждение обеими сторонами → capture + payout), эскроу-леджер, споры, авто-capture cron.

**НЕ входит в эту фазу:** UI каталога, лендинг, страницы бригад, личные кабинеты.

</domain>

<decisions>
## Implementation Decisions

### D-01: DB Migration Strategy
**Добавить escrow-колонки в существующую таблицу `orders`** — не создавать новую таблицу.
Telegram-бот и n8n продолжают работать без изменений. Новые поля (`subtotal`, `service_fee`, `service_fee_rate`, `combo_discount`, `total`, `payout_amount`, `yookassa_payment_id`, `payment_captured`, `payment_held_at`, `customer_confirmed`, `supplier_confirmed`, `payout_status_escrow`, `payout_id`) добавляются с DEFAULT NULL, не ломая существующие записи.

Статусы escrow добавить как TEXT NOT NULL DEFAULT '' рядом с существующим `status` (который использует Telegram-бот) — отдельное поле `escrow_status` с CHECK ('', 'payment_held', 'in_progress', 'pending_confirm', 'completed', 'disputed', 'cancelled').

### D-02: Confirmation UX
**Обе стороны подтверждают через PWA** — страница `/order/[id]/confirm`.
- Заказчик: ссылка отправляется через SMS + Telegram-уведомление
- Исполнитель: ссылка отправляется через Telegram-бот (@Podryad_PRO_bot)
- Страница определяет роль по параметру `?role=customer|supplier&token=<jwt>`
- JWT-токен подтверждения — отдельный, короткоживущий (24ч)

### D-03: Cron Auto-Capture
**Supabase pg_cron** — cron прямо в PostgreSQL, запускается ежедневно в 09:00 MSK.
Функция `auto_capture_expiring_holds()` находит заказы где `payment_held_at < now() - interval '6 days'` и `payment_captured = false`, вызывает YooKassa API через `pg_net` (HTTP-расширение Supabase).

Fallback: если pg_net недоступен — GitHub Actions scheduled workflow как резервный вариант.

### D-04: Payout Identity
**Добавить `payout_card TEXT` и `is_selfemployed_verified BOOLEAN` в таблицу `workers`.**
`inn` уже есть в `users` (таблица users.inn) — при выплате джойним через `workers.user_phone → users.phone`.
Исполнитель вводит карту в своём профиле в PWA перед первым получением выплаты.

### D-05: Новые таблицы
Создать отдельными таблицами:
- `escrow_ledger` — лог всех escrow-операций (hold, capture, release, refund)
- `disputes` — споры с полями initiated_by, reason, resolution

### D-06: YooKassa integration
Обновить `yukassa.ts`:
- Добавить функцию `createEscrowPayment(params)` с `capture: false`
- Добавить функцию `capturePayment(paymentId, amount)`
- Добавить функцию `createPayout(params)` для выплат исполнителям
- Оставить существующую `createPayment()` без изменений (используется для аренды/VIP)

### Claude's Discretion
- Структура JWT для confirmation token (выбрать алгоритм и payload)
- Точная структура webhook signature verification
- Дизайн страницы /order/[id]/confirm (оба состояния: ожидание + подтверждено)
- Дизайн /order/[id]/status (redirect return URL после оплаты)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing YooKassa Integration
- `pwa/src/lib/yukassa.ts` — текущая реализация (только capture:true, нужно расширить)
- `pwa/src/app/api/payments/callback/route.ts` — существующий webhook (нужно расширить для escrow)

### Database Schema
- `supabase/schema.sql` — полная текущая схема (orders, workers, payments, users)
- `supabase/migrations/005_marketplace.sql` — паттерн добавления таблиц (suppliers, listings)
- `supabase/migrations/001_initial_schema.sql` — структура начальных миграций

### DB Access Patterns
- `pwa/src/lib/db.ts` — паттерны запросов Supabase (service_role client)
- `pwa/src/lib/auth.ts` — JWT-утилиты (можно переиспользовать для confirmation tokens)

### Environment Variables Pattern
- `.env.example` — текущие переменные (YUKASSA_SHOP_ID, YUKASSA_SECRET_KEY)
- Нужно добавить: YUKASSA_PAYOUT_AGENT_ID, YUKASSA_PAYOUT_SECRET

### No external specs for YooKassa
- API документация: https://yookassa.ru/developers/api
- Escrow flow: capture:false → payment.waiting_for_capture → /capture endpoint

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `yukassa.ts` — `createPayment()` можно расширить, добавив `escrowPayment()` рядом
- `auth.ts` — JWT sign/verify утилиты для confirmation tokens (переиспользовать)
- `db.ts` — `supabaseAdmin` client (service_role) — использовать для всех escrow операций
- `pwa/src/app/api/payments/callback/route.ts` — существующий webhook, расширить switch/case

### Established Patterns
- Все API-роуты используют `supabaseAdmin` (service_role) — никаких RLS-проблем на сервере
- Миграции — отдельные .sql файлы в `supabase/migrations/`, нумерация 006_...
- ENV переменные — добавлять в `.env.example` с комментариями

### Integration Points
- Webhook `/api/payments/callback` — добавить обработку `payment.waiting_for_capture`
- Новые роуты: `/api/orders/[id]/confirm`, `/api/orders/[id]/dispute`
- Новый роут: `/api/payments/create-escrow` (отдельно от текущего create для VIP/аренды)
- Страницы: `/order/[id]/pay`, `/order/[id]/status`, `/order/[id]/confirm`
- pg_cron: добавить через SQL-миграцию в `supabase/migrations/006_escrow.sql`

</code_context>

<specifics>
## Specific Ideas

- `escrow_status` — отдельное поле TEXT в orders, не заменять существующий `status`
- Confirmation JWT: короткоживущий (24ч), payload = { orderId, role, sub: phone }
- pg_net расширение для HTTP-вызовов из pg_cron (уже доступно в Supabase)
- Fallback: если pg_net недоступен → GitHub Actions scheduled workflow
- Receipt в платеже — 2 строки: subtotal (исполнителю) + service_fee (платформе)

</specifics>

<deferred>
## Deferred Ideas

- Unified listings table (labor/material/equipment в одной таблице) → Phase 3
- Crew/brigade support в suppliers → Phase 4
- Суперадминская панель для арбитража споров → Phase 5

</deferred>

---

*Phase: 01-escrow-core*
*Context gathered: 2026-04-01*
