# Runbook — Действия при инцидентах

## 1. Supabase недоступен

**Симптомы:**
- `GET /api/health` возвращает 500
- Все API-роуты падают с ошибкой `db_error`
- В логах Vercel: `fetch failed`, `SupabaseClient`

**Действия:**
1. Проверить статус Supabase: https://status.supabase.com
2. Проверить dashboard проекта: https://supabase.com/dashboard/project/gkoxehnuvyqccuwasrhg
3. Если проект остановлен (free tier inactivity) — перезапустить в Dashboard → Settings → Resume
4. Если превышен лимит подключений — временно отключить cron job_queue в Vercel
5. Убедиться, что RLS не блокирует service_role (миграция 026_rls_hardening)

**Время восстановления:** 1–5 минут после перезапуска проекта.

---

## 2. Vercel деплой упал

**Симптомы:**
- Страницы возвращают 404 или 500
- `npm run build` падает локально
- Лендинг не грузится

**Действия:**
1. Проверить логи сборки: Vercel → Deployments → последний → Build Logs
2. Наиболее частые причины:
   - TypeScript-ошибки (прогнать `npx tsc --noEmit` локально)
   - Отсутствуют env-переменные в Vercel (Settings → Environment Variables)
   - `@ducanh2912/next-pwa` конфликтует (PWA отключён в dev)
3. Если сборка падает на PWA — временно отключить в `next.config.js`
4. Откатить на последний рабочий деплой: Vercel → Deployments → ... → Promote

**Критические env-переменные для Vercel:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SESSION_SECRET
TELEGRAM_BOT_TOKEN
ADMIN_PIN
NEXT_PUBLIC_APP_URL
CRON_SECRET
```

---

## 3. n8n не обрабатывает вебхуки

**Симптомы:**
- Лиды приходят, но не попадают в MAX
- Job queue копит pending-задачи
- `/api/cron/jobs` возвращает `dead` джобы

**Действия:**
1. Проверить n8n-инстанс: `docker compose ps` (или прямой URL)
2. Проверить логи n8n: `docker compose logs n8n`
3. Убедиться, что webhook URL активен и не истёк токен
4. Если n8n упал — перезапустить: `docker compose restart n8n`
5. Проверить, что внешний URL (Vercel → n8n) доступен из интернета
6. Ручной запуск накопленных джобов: POST `/api/cron/jobs` с `CRON_SECRET`

---

## 4. Платёжный callback не срабатывает

**Симптомы:**
- Заказ в статусе `payment_sent`, не переходит в `paid`
- Заказчик утверждает, что оплатил

**Действия (ручная процедура):**
1. Проверить платёж в банковском приложении (СБП / счёт)
2. Убедиться, что заказчик прислал скриншот/чек
3. В админ-панели: найти заказ → Сменить статус на `paid`
4. Отправить платёжную ссылку заказчику: POST `/api/admin/orders/:id/send-link`
5. Документировать в admin_audit_log (автоматически при смене статуса через админку)

---

## 5. Rate-limit блокирует легитимных пользователей

**Симптомы:**
- 429 Too Many Requests на публичных эндпоинтах
- Жалобы пользователей

**Действия:**
1. Проверить логи: искать `rate-limit` в Vercel Logs
2. Проверить Upstash Redis (если настроен): https://console.upstash.com
3. Временно увеличить лимиты через env (перезапуск не требуется — in-memory сбрасывается)
4. Если Upstash недоступен — система автоматически fallback'ает на in-memory

**Текущие лимиты:**
| Эндпоинт | Лимит | Окно |
|----------|-------|------|
| POST /api/auth/login | 5 | 15 мин |
| POST /api/admin/verify-pin | 5 | 15 мин |
| POST /api/my/recover | 3 | 10 мин |
| POST /api/orders | 5 | 15 мин |
| POST /api/orders/respond | 10 | 10 мин |

---

## 6. Job queue забита dead-джобами

**Симптомы:**
- Уведомления не уходят
- Cron возвращает 200, но заказы не обрабатываются
- `SELECT count(*) FROM job_queue WHERE status = 'dead'` > 100

**Действия:**
1. Проверить мёртвые джобы: админ-панель → Аналитика → Job Queue
2. Понять причину: `SELECT job_type, last_error, count(*) FROM job_queue WHERE status = 'dead' GROUP BY 1, 2`
3. Наиболее частые ошибки:
   - `TELEGRAM_BOT_TOKEN not set` → добавить env
   - `MAX_BOT_TOKEN not set` → добавить env
   - `fetch failed` → сетевые проблемы при отправке
4. Перезапустить джобы: `UPDATE job_queue SET status = 'pending', attempts = 0 WHERE status = 'dead'`
5. Очистить старые: `DELETE FROM job_queue WHERE status = 'dead' AND created_at < now() - interval '7 days'`

---

## 7. Контакты

| Роль | Ответственный |
|------|---------------|
| Supabase / БД | Admin (владелец проекта) |
| Vercel / Деплой | Admin |
| n8n / Docker | Admin |
| Платежи / Банк | Admin (ручная сверка) |
| MAX / Telegram каналы | Admin |

## 8. Боты Telegram/MAX не отвечают

**Симптомы:**
- Бот читает сообщения, но не отвечает
- Команды /start, /help не вызывают реакцию
- Сообщения в Telegram/MAX остаются без ответа

**Причины:**

1. **Вебхук не зарегистрирован (самая частая)**
   - Telegram: BotFather → `/setwebhook` → URL + secret_token
   - MAX: Developer Portal → Webhooks → URL
   - Проверить: `GET /api/health/bot` (покажет статус регистрации)
   - Зарегистрировать: `npm run setup:webhooks`

2. **TELEGRAM_WEBHOOK_SECRET не совпадает**
   - Значение в BotFather должно совпадать с `TELEGRAM_WEBHOOK_SECRET` в Vercel env
   - Если секрет задан в BotFather, но не задан в Vercel — вебхук принимает запросы без проверки (дыра)
   - Если секреты отличаются — Telegram получает 403, вебхук не работает

3. **NEXT_PUBLIC_APP_URL не совпадает с реальным URL**
   - В `vercel.json` или `.env.local` → должно быть `https://podryad.pro`
   - Если вебхук зарегистрирован на `http://localhost:3000` — продакшен бот не получит сообщения

4. **Telegram API недоступен**
   - Проверить: `curl https://api.telegram.org/bot{TOKEN}/getMe`
   - Проверить статус: https://core.telegram.org/bots/api → статус API

5. **OpenAI API не работает**
   - Для команд `/start` и `/help` AI не нужен — если и они не работают, проблема в п.1
   - Для свободных сообщений бот использует OpenAI → проверить `OPENAI_API_KEY`
   - При ошибке AI бот возвращает fallback-сообщение, а не молчит

6. **Vercel лямбда не обрабатывает POST**
   - Проверить логи Vercel: Deployments → Functions → логи функции
   - Искать ошибки: `processMessage failed`, `TelegramTransport`, `OpenAIClient`

**Диагностика:**

```bash
# Проверка статуса ботов (без запуска PWA)
curl https://podryad.pro/api/health/bot | jq .

# Проверка Telegram вручную
curl "https://api.telegram.org/bot{TOKEN}/getMe"
curl "https://api.telegram.org/bot{TOKEN}/getWebhookInfo"

# Локальная регистрация вебхуков
cd pwa && npm run setup:webhooks:check
cd pwa && npm run setup:webhooks:dry
```

**Восстановление:**
1. `cd pwa && npm run setup:webhooks` — перерегистрирует вебхуки
2. Проверить `curl https://podryad.pro/api/health/bot` — оба канала должны показывать `"ok": true`
3. Отправить /start боту в Telegram — должен ответить
4. Если не отвечает — смотреть логи Vercel: Deployments → Functions → `/api/telegram/webhook`
