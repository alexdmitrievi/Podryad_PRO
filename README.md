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

Актуальный список и комментарии — в **`.env.example`**. Кратко:

| Переменная | Описание |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Токен бота |
| `TELEGRAM_CHANNEL_ID` | ID канала |
| `NEXT_PUBLIC_SUPABASE_URL` | URL проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (клиент) |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (сервер, API, n8n) |
| `N8N_WEBHOOK_BASE` | Базовый URL webhooks n8n |
| `SESSION_SECRET` | Подпись cookie личного кабинета |

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
