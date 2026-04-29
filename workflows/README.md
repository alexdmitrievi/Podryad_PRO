# n8n Workflows — Подряд PRO

16 рабочих воркфлоу для автоматизации платформы. Все используют Supabase (PostgreSQL) + Telegram + MAX.

## Активные воркфлоу

| # | Файл | Триггер | Что делает |
|---|------|---------|------------|
| 06 | `06-daily-analytics.json` | Cron 20:00 МСК | Дневная аналитика → отчёт админу в Telegram |
| 07 | `07-max-crosspost.json` | Cron каждые 2 мин | Кросс-пост оплаченных заказов в MAX-канал |
| 11 | `11-lead-notification.json` | Webhook `/lead-notification` | Уведомление о новой заявке с лендинга |
| 12 | `12-payment-held.json` | Webhook `/payment-held` | Уведомление админу: платёж удержан (escrow) |
| 13 | `13-payout-notification.json` | Webhook `/payout-notification` | Уведомление: выплата исполнителю оформлена |
| 14 | `14-order-created.json` | Webhook `/order-created` | Уведомление о новом заказе из PWA |
| 15 | `15-contractor-registered.json` | Webhook `/contractor-registered` | Уведомление о новом исполнителе |
| 16 | `16-send-dashboard-link.json` | Webhook `/send-dashboard-link` | Отправка ссылки на дашборд заказчику |
| 17 | `17-send-invoice.json` | Webhook `/send-invoice` | Отправка счёта / реквизитов заказчику |
| 18 | `18-customer-lead-nurture.json` | Webhook `/crm-lead-nurture` | **RAG** CRM-агент заказчиков: nurture-цепочка (welcome → 2ч → 24ч → 3дн) с RAG-контекстом + email |
| 19 | `19-executor-avito-nurture.json` | Cron каждые 6 ч | **RAG** CRM-агент исполнителей: Авито-рекрутинг с RAG-контекстом + email-инвайты |
| 20 | `20-crm-conversion-tracker.json` | Webhook `/crm-conversion` | Трекер конверсий CRM: обновляет стадии воронки при order/contractor событиях |
| 21 | `21-dispute-opened.json` | Webhook `/dispute-opened` | Уведомление админу: открыт новый спор |
| 22 | `22-dispute-resolved.json` | Webhook `/dispute-resolved` | Уведомление всех сторон: спор разрешён |
| 23 | `23-send-payment-link.json` | Webhook `/send-payment-link` | Отправка клиенту ссылки в личный кабинет для оплаты и статуса заказа |
| 24 | `24-crm-prospect-events.json` | Webhook `/crm-prospect` | Уведомления по ручному CRM-ведению prospect-ов (добавление и смена стадии) |

## ENV-переменные (n8n)

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
TELEGRAM_BOT_TOKEN=123:ABC...
TELEGRAM_ADMIN_CHAT_ID=12345
MAX_BOT_TOKEN=xxx
MAX_API_BASE=https://api.max.im
MAX_CHANNEL_ID=xxx
MAX_ADMIN_USER_ID=xxx
```

## ENV-переменные (PWA .env.local)

```
# Основные webhook-ы (workflows 11-17)
N8N_LEADS_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/lead-notification
N8N_ORDER_CREATED_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/order-created
N8N_CONTRACTOR_REGISTERED_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/contractor-registered
N8N_SEND_DASHBOARD_LINK_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/send-dashboard-link
N8N_SEND_PAYMENT_LINK_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/send-payment-link
N8N_PAYOUT_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/payout-notification
N8N_PAYMENT_HELD_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/payment-held

# CRM Agent webhooks (workflows 18-20)
N8N_CRM_LEAD_NURTURE_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/crm-lead-nurture
N8N_CRM_CONVERSION_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/crm-conversion
N8N_CRM_PROSPECT_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/crm-prospect
N8N_SEND_INVOICE_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/send-invoice
CRM_WEBHOOK_SECRET=your-secret-here

# Dispute webhooks (workflows 21-22)
N8N_DISPUTE_OPENED_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/dispute-opened
N8N_DISPUTE_RESOLVED_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/dispute-resolved
```

## Карта подключений (PWA API → Workflow)

```
/api/leads                              → 11 (lead-notification) + 18 (crm-lead-nurture)
/api/orders                             → 14 (order-created)
/api/orders/create                      → 11 (lead-notification)
/api/orders/respond                     → 11 (lead-notification)
/api/orders/[id]/dispute (POST)         → 21 (dispute-opened)
/api/orders/[id]/dispute (PATCH)        → 22 (dispute-resolved)
/api/catalog-orders                     → 11 (lead-notification)
/api/admin/orders/[id]/payment-status   → 12 (payment-held) + 13 (payout-notification)
/api/contractors                        → 15 (contractor-registered) + 20 (crm-conversion)
/api/my/recover                         → 16 (send-dashboard-link)
/api/admin/orders/[id]/send-invoice     → 17 (send-invoice)
/api/admin/orders/[id]/send-link        → 23 (send-payment-link)
/api/crm/update-stage                   → 20 (crm-conversion)
/api/admin/crm/prospects                → 24 (crm-prospect)
Cron (n8n)                              → 06 (analytics), 07 (max-crosspost), 19 (avito-nurture)
```

## Целевая карта миграции (n8n → Vercel + Supabase job_queue)

| # | Текущий workflow | Целевой `queue_name / job_type` | Кто ставит job | Что делает handler |
|---|------------------|----------------------------------|----------------|--------------------|
| 06 | `06-daily-analytics.json` | `analytics / analytics.daily_admin_report` | Vercel Cron (`20:00 MSK`) | Собирает дневную аналитику и отправляет админский отчёт |
| 07 | `07-max-crosspost.json` | `marketplace / marketplace.max_crosspost_paid_orders` | Vercel Cron (`*/2 * * * *`) | Ищет оплаченные заказы без MAX-публикации и постит их в канал |
| 11 | `11-lead-notification.json` | `notifications / notify.lead_created` и `notifications / notify.executor_response_received` | `/api/leads`, `/api/orders/create`, `/api/catalog-orders`, `/api/orders/respond` | Разделяет текущий смешанный webhook на отдельные уведомления по лидам и откликам исполнителей |
| 12 | `12-payment-held.json` | `notifications / notify.payment_held` | `/api/admin/orders/[id]/payment-status` | Уведомляет админа об удержании платежа |
| 13 | `13-payout-notification.json` | `notifications / notify.payout_initiated` | `/api/admin/orders/[id]/payment-status` | Уведомляет о запуске выплаты исполнителю |
| 14 | `14-order-created.json` | `notifications / notify.order_created` | `/api/orders` | Уведомляет о новом заказе из PWA |
| 15 | `15-contractor-registered.json` | `notifications / notify.contractor_registered` | `/api/contractors` | Уведомляет о новом исполнителе |
| 16 | `16-send-dashboard-link.json` | `customer / customer.send_dashboard_link` | `/api/my/recover` | Отправляет заказчику ссылку на `/my/{token}` |
| 17 | `17-send-invoice.json` | `customer / customer.send_invoice` | `/api/admin/orders/[id]/send-invoice` | Отправляет счёт / реквизиты клиенту |
| 18 | `18-customer-lead-nurture.json` | `crm / crm.customer_nurture_step` | Lead/create handler enqueue-ит welcome + delayed jobs через `run_at` | Выполняет nurture-цепочку заказчика (`welcome`, `+2h`, `+24h`, `+72h`) с RAG-контекстом |
| 19 | `19-executor-avito-nurture.json` | `crm / crm.executor_prospect_followup` | Prospect create/stage-change handler enqueue-ит follow-up jobs; опционально safety sweep cron раз в 6 часов | Ведёт цепочку касаний по исполнителям и инвайты в регистрацию |
| 20 | `20-crm-conversion-tracker.json` | `crm / crm.conversion_event` | `/api/contractors`, `/api/crm/update-stage`, order/contractor domain events | Идемпотентно обновляет стадии CRM и связанные поля конверсии |
| 21 | `21-dispute-opened.json` | `disputes / dispute.opened` | `/api/orders/[id]/dispute` (`POST`) | Уведомляет админа об открытом споре |
| 22 | `22-dispute-resolved.json` | `disputes / dispute.resolved` | `/api/orders/[id]/dispute` (`PATCH`) | Уведомляет стороны о результате спора |
| 23 | `23-send-payment-link.json` | `customer / customer.send_payment_link` | `/api/admin/orders/[id]/send-link` | Отправляет клиенту ссылку на оплату и статус заказа |
| 24 | `24-crm-prospect-events.json` | `crm / crm.prospect_stage_event` | `/api/admin/crm/prospects` | Шлёт уведомления по ручному CRM-ведению prospect-ов и смене стадии |

### Примечания к миграции

- `06`, `07` и `19` больше не нуждаются в n8n Cron Trigger: их запускает Vercel Cron, а сама работа идёт через `job_queue`.
- `11` намеренно разбит на два `job_type`, потому что лиды и отклики исполнителей имеют разную полезную нагрузку и разные шаблоны сообщений.
- `18` и `19` лучше хранить как серию обычных delayed jobs с `run_at`, а не как длинный сценарий в одном workflow.
- Весь критический side effect должен идти по схеме: `DB write -> enqueue job -> worker handler`, без прямого fire-and-forget `fetch()` во внешнюю автоматику.

## RAG-архитектура (workflows 18, 19)

Оба CRM-агента используют **RAG** (Retrieval-Augmented Generation):

1. **Память**: Все сообщения хранятся в `crm_messages` (направление, канал, текст, дата)
2. **Извлечение**: Перед генерацией каждого сообщения — запрос последних 15 сообщений из истории
3. **Контекст**: Сообщения адаптируются к истории общения (ссылки на прошлые ответы, учёт стадии)
4. **Профиль**: `conversation_summary` обновляется после каждого взаимодействия
5. **Мультиканал**: TG-алерт админу + email клиенту (если email есть)

### DB-миграция для RAG

```sql
-- 014_crm_rag.sql добавляет:
-- conversation_summary TEXT     — резюме общения
-- user_preferences JSONB        — извлечённые предпочтения
-- last_inbound_message TEXT     — последнее сообщение от пользователя
-- last_inbound_at TIMESTAMPTZ   — когда
```

## Настройка SMTP (email-канал)

1. В n8n → Settings → Credentials → Add Credential → SMTP
2. Имя: **Podryad PRO SMTP**
3. Настройки SMTP (пример для Yandex):
   - Host: `smtp.yandex.ru`
   - Port: `465`
   - SSL: `true`
   - User: `noreply@podryad.pro`
   - Password: app-password
4. Workflows 18 и 19 автоматически используют этот credential

## Импорт в n8n

1. Откройте n8n → Import from File → выберите JSON
2. Настройте credentials: Telegram Bot + **SMTP** (Podryad PRO SMTP)
3. Проверьте ENV-переменные
4. Активируйте воркфлоу
