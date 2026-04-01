# Phase 1: Escrow Core — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 01-escrow-core
**Areas discussed:** DB migration strategy, Confirm UX, Cron runner, Payout identity

---

## DB Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Добавить колонки в существующую | Non-breaking, Telegram-бот продолжает работать | ✓ |
| Новая таблица escrow_orders | Чистая архитектура, но дублирует логику | |
| Полный рефакторинг orders | Чисто по спеку, но рискованно для prod | |

**User's choice:** Добавить colones в существующую (Recommended)
**Notes:** Telegram-бот и n8n продолжают работать без изменений. Добавляем escrow_status как отдельное поле.

---

## Confirmation UX

| Option | Description | Selected |
|--------|-------------|----------|
| Оба через PWA | Единый flow, ссылка через SMS + Telegram | ✓ |
| Заказчик SMS, исполнитель Telegram | Нативнее для каждой роли | |
| Только один инициирует | Проще, меньше точек отказа | |

**User's choice:** Оба через PWA (Recommended)
**Notes:** JWT-токен подтверждения, параметр role=customer|supplier в URL.

---

## Cron Runner

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase pg_cron | PostgreSQL-native, надёжно, без внешних зависимостей | ✓ |
| GitHub Actions scheduled | Бесплатно, легко дебажить | |
| n8n scheduled workflow | Единая точка автоматики | |

**User's choice:** Supabase pg_cron (Recommended)
**Notes:** pg_net для HTTP-вызовов YooKassa. Fallback: GitHub Actions.

---

## Payout Identity

| Option | Description | Selected |
|--------|-------------|----------|
| Добавить в workers | Минимум изменений, inn уже есть в users | ✓ |
| Новая таблица supplier_payouts | Чище, поддерживает несколько счетов | |
| Хранить в order_items snapshot | Иммутабельно, но нет профиля | |

**User's choice:** Добавить в таблицу workers (Recommended)
**Notes:** payout_card + is_selfemployed_verified. inn берётся из users через user_phone FK.

---

## Claude's Discretion

- Структура JWT confirmation token
- Дизайн страниц /order/[id]/confirm и /order/[id]/status
- Webhook signature verification implementation

## Deferred Ideas

- Unified listings table → Phase 3
- Crew/brigade support → Phase 4
- Admin arbitrage panel → Phase 5
