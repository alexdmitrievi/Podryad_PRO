# n8n Workflows — Подряд PRO Premium Integration

## Workflow Files (import via n8n UI: Settings → Import)

| # | File | Trigger | Purpose |
|---|------|---------|---------|
| 01 | `01-job-queue-worker.json` | Cron every 30s | **Главный воркер** — разбирает `job_queue`: chat.lead_intent → bot_leads, bot.lead_created → уведомления, channel.incoming_message → bot_messages, bot.material_order → material_requests |
| 02 | `02-recurring-mowing.json` | Cron Mon/Wed/Fri 09:00 | Повторный покос — рассылка клиентам каждые 12-14 дней |
| 03 | `03-seasonal-pool.json` | Cron May 1 & 15 10:00 | Сезонное открытие бассейнов — рассылка владельцам |
| 04 | `04-error-watch.json` | Cron every 5 min | Мониторинг ошибок из app_logs → алерт владельцу в Telegram |
| 05 | `05-referral-loyalty.json` | Cron every 5 min | Уведомления о квалификации рефералов (приглашённый + пригласивший + владелец) |
| 06 | `06-loyalty-weekly-report.json` | Cron Mon 09:00 | Еженедельный дайджест: рефералы, повторные заказы, бонусный баланс |
| 07 | `07-crm-nurture-worker.json` | Cron every 1m | **CRM Nurture** — разбирает `crm` очередь: welcome → followup_2h → followup_24h → followup_72h цепочка касаний |
| 08 | `08-bot-health-cleanup.json` | Cron every 10m | **Health Monitor** — очистка bot_sessions >24ч, мониторинг dead/pending джобов, алерт владельцу при проблемах |

> **Note:** Workflow 01 + 07 вместе образуют полный слой оркестрации Telegram/MAX — Vercel пишет джобы, n8n их обрабатывает и отправляет сообщения через Bot API.

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
5. **Activate workflows 01, 07, and 08 first** (core bot orchestration)
6. Then activate 02-06 as needed for premium features
