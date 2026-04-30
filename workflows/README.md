# Автоматизация — Подряд PRO

Вся автоматизация работает через **Vercel Cron → `/api/cron/jobs` → Supabase `job_queue`**.
n8n не используется.

## Карта: API-маршрут → job_type

| API-маршрут | `queue_name` | `job_type` |
|---|---|---|
| `POST /api/orders` | `notifications` | `notify.order_created` |
| `POST /api/orders/create` | `notifications` | `notify.lead_created` |
| `POST /api/orders/respond` | `notifications` | `notify.executor_response_received` |
| `POST /api/leads` | `notifications` | `notify.lead_created` |
| `POST /api/catalog-orders` | `notifications` | `notify.lead_created` |
| `POST /api/contractors` | `notifications` | `notify.contractor_registered` |
| `POST /api/orders/[id]/dispute` | `disputes` | `dispute.opened` |
| `PATCH /api/orders/[id]/dispute` | `disputes` | `dispute.resolved` |
| `POST /api/admin/orders/[id]/payment-status` (held) | `notifications` | `notify.payment_held` |
| `POST /api/admin/orders/[id]/payment-status` (payout) | `notifications` | `notify.payout_initiated` |
| `POST /api/admin/orders/[id]/send-link` | `customer` | `customer.send_payment_link` |
| `POST /api/admin/orders/[id]/send-invoice` | `customer` | `customer.send_invoice` |
| `POST /api/my/recover` | `customer` | `customer.send_dashboard_link` |
| `POST /api/admin/crm/prospects` | `crm` | `crm.prospect_stage_event` |
| `PUT /api/admin/crm/prospects` | `crm` | `crm.prospect_stage_event` |

## Vercel Cron

| Расписание | Путь | Что делает |
|---|---|---|
| `* * * * *` (каждую минуту) | `/api/cron/jobs` | Забирает due-задачи из `job_queue` и выполняет их |

## Переменные окружения

Все нужные переменные — в `pwa/.env.example`.
Ключевые для очереди:

```
CRON_SECRET=                  # Bearer-токен для /api/cron/jobs
SUPABASE_SERVICE_ROLE_KEY=    # Нужен для job_queue (service-only RLS)
```

## Retry / Dead-letter

- До **3 попыток** с экспоненциальным backoff (1 мин → 5 мин → 15 мин)
- После 3 неудач статус `dead` — job остаётся в таблице для ручной проверки
- Дедупликация: поле `dedupe_key` предотвращает двойную постановку одного события
