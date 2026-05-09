# n8n Workflows — Подряд PRO Premium Integration

## Workflow Files (import via n8n UI: Settings → Import)

| # | File | Trigger | Purpose |
|---|------|---------|---------|
| 02 | `02-recurring-mowing.json` | Cron Mon/Wed/Fri 09:00 | Повторный покос — рассылка клиентам каждые 12-14 дней |
| 03 | `03-seasonal-pool.json` | Cron May 1 & 15 10:00 | Сезонное открытие бассейнов — рассылка владельцам |
| 04 | `04-error-watch.json` | Cron every 5 min | Мониторинг ошибок из app_logs → алерт владельцу в Telegram |
| 05 | `05-referral-loyalty.json` | Cron every 5 min | Уведомления о квалификации рефералов (приглашённый + пригласивший + владелец) |
| 06 | `06-loyalty-weekly-report.json` | Cron Mon 09:00 | Еженедельный дайджест: рефералы, повторные заказы, бонусный баланс |

> **Note:** Workflow 01 (lead-events) не включён — уведомления о новых лидах обрабатываются через существующий Vercel Cron + job_queue.

## Required Credentials

Create these in n8n (Settings → Credentials):

| Name | Type | Details |
|------|------|---------|
| `supabase-direct` | Postgres | Direct connection string from Supabase Dashboard → Settings → Database |
| `tg-main` | Telegram API | Bot token from `TELEGRAM_BOT_TOKEN` |
| `tg-owner` | Telegram API | Bot token for owner alerts (chat ID = `TELEGRAM_OWNER_CHAT_ID`) |

## Required Environment Variables (set in n8n)

| Variable | Description |
|----------|-------------|
| `PREMIUM_INBOUND_SECRET` | Shared secret (same as in Vercel) |
| `TELEGRAM_OWNER_CHAT_ID` | `407721399` |
| `MAX_API_URL` | `https://platform-api.max.ru` |
| `MAX_BOT_TOKEN` | MAX bot access token |

## Import Instructions

1. Start n8n: `docker compose up -d n8n`
2. Open n8n at `https://n8n.podryad.pro` (after nginx + certbot setup)
3. Create credentials first (Postgres, Telegram Main, Telegram Owner)
4. Import each workflow via Settings → Import from File
5. Activate workflows: toggle the "Active" switch for each
