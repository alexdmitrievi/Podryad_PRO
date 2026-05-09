# Vercel Environment Variables — Premium Integration

Скопируйте эти переменные в Vercel Dashboard → Settings → Environment Variables.

## Production

| Key | Value | Type |
|-----|-------|------|
| `TELEGRAM_WEBHOOK_SECRET` | random-32-chars | Secret |
| `MAX_WEBHOOK_SECRET` | random-32-chars | Secret |
| `PREMIUM_INBOUND_SECRET` | random-32-chars (same as in n8n) | Secret |
| `TELEGRAM_OWNER_CHAT_ID` | Your Telegram chat ID | Plain |
| `MAX_OWNER_USER_ID` | Your MAX user ID | Plain |
| `N8N_LEAD_EVENTS_WEBHOOK_URL` | https://n8n.podryad.pro/webhook/lead-events | Plain |
| `N8N_REFERRAL_WEBHOOK_URL` | https://n8n.podryad.pro/webhook/referral | Plain |
| `LOYALTY_DISCOUNT_CAP_RUB` | 500 | Plain |

## Vercel CLI (if available)

```bash
# Add production secrets
vercel env add TELEGRAM_WEBHOOK_SECRET production
vercel env add MAX_WEBHOOK_SECRET production
vercel env add PREMIUM_INBOUND_SECRET production
vercel env add TELEGRAM_OWNER_CHAT_ID production
vercel env add MAX_OWNER_USER_ID production
vercel env add N8N_LEAD_EVENTS_WEBHOOK_URL production
vercel env add N8N_REFERRAL_WEBHOOK_URL production
vercel env add LOYALTY_DISCOUNT_CAP_RUB production
```
