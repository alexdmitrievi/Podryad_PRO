# n8n Workflows — Подряд PRO

9 рабочих воркфлоу для автоматизации платформы. Все используют Supabase (PostgreSQL) + Telegram + MAX.

## Активные воркфлоу

| # | Файл | Триггер | Что делает |
|---|------|---------|------------|
| 06 | `06-daily-analytics.json` | Cron 20:00 МСК | Дневная аналитика → отчёт админу в Telegram |
| 07 | `07-max-crosspost.json` | Cron каждые 2 мин | Кросс-пост оплаченных заказов в MAX-канал |
| 11 | `11-lead-notification.json` | Webhook `/lead-notification` | Уведомление о новой заявке с лендинга |
| 12 | `12-payment-held.json` | Webhook `/payment-held` | Уведомление об эскроу-холде (YooKassa) |
| 13 | `13-payout-reminder.json` | Webhook `/payout-notification` | Напоминание о ручной выплате |
| 14 | `14-order-created.json` | Webhook `/order-created` | Уведомление о новом заказе из PWA |
| 15 | `15-contractor-registered.json` | Webhook `/contractor-registered` | Уведомление о новом исполнителе |
| 16 | `16-send-dashboard-link.json` | Webhook `/send-dashboard-link` | Отправка ссылки на дашборд заказчику |
| 17 | `17-send-payment-link.json` | Webhook `/send-payment-link` | Отправка ссылки на оплату заказчику |

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
N8N_LEADS_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/lead-notification
N8N_ORDER_CREATED_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/order-created
N8N_CONTRACTOR_REGISTERED_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/contractor-registered
N8N_SEND_DASHBOARD_LINK_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/send-dashboard-link
N8N_SEND_PAYMENT_LINK_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/send-payment-link
```

## Импорт в n8n

1. Откройте n8n → Import from File → выберите JSON
2. Настройте credentials (Telegram Bot)
3. Проверьте ENV-переменные
4. Активируйте воркфлоу
