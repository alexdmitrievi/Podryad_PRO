# 🔨 Подряд PRO | Работа Омск

Платформа для поиска работы и подработки в Омске.  
Telegram-бот + канал + PWA + n8n автоматизация. **Данные: Supabase (PostgreSQL)**, не Google Sheets.

## 📂 Структура проекта

```
podryad-pro/
├── workflows/                  ← JSON для импорта в n8n (+ README про Supabase)
├── google-apps-script/         ← устарело: было для создания листов (архив)
├── supabase/                   ← SQL-фрагменты (push_subscriptions и др.)
├── scripts/                    ← cron / GitHub Actions (Supabase)
├── .github/workflows/          ← GitHub Actions (проверка Supabase)
├── pwa/                        ← Next.js 15 PWA
│   ├── src/
│   ├── vercel.json
│   └── package.json
├── docker/
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🚀 Быстрый старт

### Шаг 1: Supabase

1. Создай проект на [supabase.com](https://supabase.com/).
2. В **SQL Editor** выполни SQL схемы таблиц (`orders`, `workers`, `rates`, …) — ориентир в репозитории: `supabase/schema.sql` и полный скрипт схемы из вашей документации/миграции.
3. Включи **Realtime** для таблицы `orders`, если нужен живой дашборд PWA (**Database → Publications**).
4. Скопируй в `.env` / Vercel:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (только сервер, не в браузер)

Подробнее переменные: `.env.example`.

### Шаг 2: Telegram бот

1. Напиши [@BotFather](https://t.me/BotFather) → `/newbot`
2. Сохрани токен бота
3. Создай канал для заказов, добавь бота как администратора
4. Узнай ID канала (переслав пост из канала боту [@userinfobot](https://t.me/userinfobot))
5. Узнай свой Telegram ID (тот же бот)

### Шаг 3: OpenAI

1. Зарегистрируйся на [platform.openai.com](https://platform.openai.com/)
2. Создай API ключ
3. Пополни баланс (GPT-4o-mini стоит ~$0.15/1M tokens)

### Шаг 4: n8n

1. Зарегистрируйся на [n8n.cloud](https://n8n.cloud/) или подними свой инстанс (см. `docker-compose.yml`).
2. Импортируй JSON из папки `workflows/`.
3. **Важно:** старые файлы ссылаются на **Google Sheets** — замени ноды на **Supabase / HTTP (PostgREST) / Postgres** (см. `workflows/README.md`).
4. Настрой креды: **Telegram**, **OpenAI**, переменные `SUPABASE_*` для HTTP-запросов к API.
5. **Activate** каждый workflow.

### Шаг 5: PWA деплой (Vercel)

**В настройках проекта Vercel (Settings → General):**

- **Root Directory:** `pwa` — обязательно, Next.js лежит в этой папке.
- **Build / Install / Output:** по умолчанию: `npm install`, `npm run build`.

```bash
cd pwa
cp ../.env.example .env.local
# Заполни .env.local — в т.ч. Supabase и SESSION_SECRET

npm install
npm run build
npm run dev          # Локально на :3000
```

Переменные продакшена: **Vercel → Environment Variables** (как в `.env.example`, без коммита секретов).

### Шаг 6: VPS деплой n8n (продакшен)

```bash
cp .env.example .env
# Заполни .env

docker-compose up -d
docker-compose logs -f n8n
```

## ⚙️ Переменные окружения

Создай файл `pwa/.env.local` для локальной разработки. Для продакшена все переменные добавляются в **Vercel → Settings → Environment Variables**.

> Переменные с префиксом `NEXT_PUBLIC_` видны в браузере — не клади туда секреты.

### 🟦 Supabase
**→ [supabase.com/dashboard/project/rnqalafmuyrlfioqdore/settings/api](https://supabase.com/dashboard/project/rnqalafmuyrlfioqdore/settings/api)**

| Переменная | Откуда брать |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://rnqalafmuyrlfioqdore.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project API Keys → **anon / public** |
| `SUPABASE_SERVICE_ROLE_KEY` | Project API Keys → **service_role** (только сервер!) |

### 🔐 Auth / Session — генерируй сам
```powershell
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('CUSTOMER_JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('CRON_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('CRM_WEBHOOK_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

| Переменная | Описание |
|---|---|
| `SESSION_SECRET` | Подпись cookie сессии исполнителей (64 байта hex) |
| `CUSTOMER_JWT_SECRET` | JWT токен для заказчиков (32 байта hex) |
| `CRON_SECRET` | Защита cron-endpoint `/api/cron/*` |
| `CRM_WEBHOOK_SECRET` | Защита `/api/crm/update-stage` |
| `ADMIN_PIN` | PIN для входа в админ-панель (4–6 цифр) |

### 🤖 Telegram
**→ [@BotFather](https://t.me/BotFather) → `/newbot`**

| Переменная | Описание |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Токен бота (вида `7123456789:AAFxxxx...`) |
| `NEXT_PUBLIC_BOT_NAME` | Имя бота без @ (например `Podryad_PRO_bot`) |
| `NEXT_PUBLIC_MAX_CHANNEL_LINK` | Ссылка на канал в MAX Messenger |

### 💳 ЮKassa
**→ [yookassa.ru/my/api-keys](https://yookassa.ru/my/api-keys)**

| Переменная | Откуда брать |
|---|---|
| `YUKASSA_SHOP_ID` | Настройки → shopId (число) |
| `YUKASSA_SECRET_KEY` | API ключи → Секретный ключ (`test_xxxx` или `live_xxxx`) |
| `YUKASSA_PAYOUT_AGENT_ID` | Выплаты → Подключение → agentId (нужен договор агента) |
| `YUKASSA_PAYOUT_SECRET` | Выплаты → API ключ для выплат |
| `NEXT_PUBLIC_YUKASSA_PAYOUT_WIDGET_KEY` | Выплаты → Интеграция → Ключ виджета |

### 🔔 Web Push (VAPID)
Сгенерировать один раз:
```powershell
Push-Location "pwa"; npx web-push generate-vapid-keys; Pop-Location
```

| Переменная | Описание |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Публичный VAPID ключ |
| `VAPID_PRIVATE_KEY` | Приватный VAPID ключ |
| `VAPID_SUBJECT` | Email для VAPID (например `mailto:admin@podryad.pro`) |

### 🤖 OpenAI (CRM агент)
**→ [platform.openai.com/api-keys](https://platform.openai.com/api-keys)**

| Переменная | Значение по умолчанию |
|---|---|
| `OPENAI_API_KEY` | `sk-proj-xxxx...` |
| `OPENAI_MODEL` | `gpt-4o` |
| `OPENAI_MAX_TOKENS` | `1024` |
| `OPENAI_TEMPERATURE` | `0.3` |

### 💬 Дополнительные мессенджеры (опционально)

| Переменная | Откуда |
|---|---|
| `MAX_BOT_TOKEN` | [max.ru](https://max.ru) → Developer → Bots |
| `AVITO_CLIENT_ID` | [developers.avito.ru/apps](https://developers.avito.ru/apps) |
| `AVITO_CLIENT_SECRET` | То же приложение Avito |
| `AVITO_USER_ID` | Числовой ID аккаунта Avito (из URL профиля) |

### 🌐 App URL

| Переменная | Локально | Продакшен |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://podryad.pro` |

### 🔗 n8n Webhooks
**→ [astra55.app.n8n.cloud](https://astra55.app.n8n.cloud)** — откройте workflow → Webhook нода → скопируйте **Production URL**

| Переменная | Workflow |
|---|---|
| `N8N_LEADS_WEBHOOK_URL` | `11-lead-notification` |
| `N8N_PAYMENT_HELD_WEBHOOK_URL` | `12-payment-held` |
| `N8N_PAYOUT_WEBHOOK_URL` | `13-payout-reminder` |
| `N8N_ORDER_CREATED_WEBHOOK_URL` | `14-order-created` |
| `N8N_CONTRACTOR_REGISTERED_WEBHOOK_URL` | `15-contractor-registered` |
| `N8N_SEND_DASHBOARD_LINK_WEBHOOK_URL` | `16-send-dashboard-link` |
| `N8N_SEND_PAYMENT_LINK_WEBHOOK_URL` | `17-send-payment-link` |
| `N8N_CRM_LEAD_NURTURE_WEBHOOK_URL` | `18-customer-lead-nurture` |
| `N8N_CRM_PROSPECT_WEBHOOK_URL` | `19-executor-avito-nurture` |
| `N8N_CRM_CONVERSION_WEBHOOK_URL` | `20-crm-conversion-tracker` |

### Приоритет настройки

1. **Supabase** — без этого ничего не работает
2. **SESSION_SECRET + CUSTOMER_JWT_SECRET + ADMIN_PIN** — генерируй сразу
3. **TELEGRAM_BOT_TOKEN** — уведомления и бот
4. **YUKASSA_SHOP_ID + YUKASSA_SECRET_KEY** — платежи
5. **OPENAI_API_KEY** — CRM агент
6. **VAPID ключи** — push-уведомления
7. **n8n webhooks** — по мере активации workflows

## 🔄 Как работает система

```
Заказчик пишет боту
        ↓
[Workflow 1] GPT парсит текст → геокодинг → запись в Supabase (orders)
        ↓
Заказчик оплачивает
        ↓
[Workflow 2] Пост с картой в канал
        ↓
Исполнитель жмёт «Готов»
        ↓
[Workflow 3] Проверка → обновление заказа в БД → уведомления
        ↓
Работа выполнена → /done
        ↓
[Workflow 4] Опрос → рейтинг → обновление workers / orders
        ↓
[Workflow 6] Ежедневный отчёт админу
```

## 💰 Монетизация

- **500₽** — публикация заказа
- **1 000₽/мес** — VIP подписка
- **1 000₽** — подбор ТОП-3 исполнителей (/pick)
- **Реклама** — платные посты от подрядчиков

## 🛠 Troubleshooting

| Проблема | Решение |
|---|---|
| Бот не отвечает | Проверь что Telegram Trigger активен в n8n |
| Геокодер не работает | Проверь User-Agent в Nominatim запросе |
| n8n не пишет в БД | Проверь `SUPABASE_SERVICE_ROLE_KEY` и URL в HTTP-нодах |
| PWA не видит заказы | Проверь RLS и что API использует service role на сервере |
| Realtime на дашборде молчит | Включи таблицу `orders` в Realtime (Publications) |
| GitHub Action падает | Задай секреты `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

## 📝 TODO на будущее

- [ ] Полная замена Google-нод в экспортированных JSON n8n на Supabase
- [ ] Подключить боевую ЮKassa (сейчас заглушка через /approve)
- [ ] Telegram Mini App вместо PWA
- [ ] Автоматическое продление VIP
- [ ] Admin panel (React dashboard)

## 📄 Лицензия

Частный проект. Все права защищены.
