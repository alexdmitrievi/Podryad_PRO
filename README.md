# Подряд PRO | Работа Омск

Платформа для поиска исполнителей и заказов в Омске.
Telegram-бот с AI-парсингом заявок, картой на Leaflet, автоматизацией через n8n и PWA на Next.js 15.

**Требования:** Node.js 18.17+, Docker 24+, домен с DNS A-записью на VPS.

## Архитектура

```
Заказчик → Telegram бот → n8n (GPT парсинг + Nominatim) → Google Sheets
                                    ↓
                              Пост в канале (геоточка + кнопки)
                                    ↓
Исполнитель → жмёт "Готов" → n8n проверяет доступ → закрывает заказ
                                    ↓
                         Уведомления обеим сторонам + оценка
```

> **Важно:** Google Sheets используется как MVP-хранилище. При масштабировании (>500 заказов/день)
> рекомендуется миграция на PostgreSQL/Supabase.

## Структура проекта

```
Подряд_PRO/
├── scripts/
│   ├── setup-sheets.gs        # Google Apps Script для создания таблиц
│   └── init-ssl.sh            # Первичная настройка SSL на VPS
├── workflows/
│   ├── 01-order-intake.json   # Приём и парсинг заявок
│   ├── 02-publish-order.json  # Публикация в канал после оплаты
│   ├── 03-handle-response.json # Отклики исполнителей
│   ├── 04-rating-system.json  # Рейтинги и штрафы
│   ├── 05-monetization.json   # VIP + подбор исполнителей
│   └── 06-daily-analytics.json # Ежедневная аналитика
├── podryad-pro/               # Next.js 15 PWA
│   ├── src/
│   │   ├── app/               # App Router pages
│   │   ├── components/        # React компоненты
│   │   └── lib/               # Утилиты (Sheets API, Nominatim)
│   └── public/                # PWA manifest, иконки
├── docker-compose.yml         # n8n + nginx + certbot
├── nginx.conf                 # Reverse proxy с SSL
├── .env.example               # Шаблон переменных окружения
└── README.md
```

## Быстрый старт

### 1. Google Sheets

1. Создайте новую Google Таблицу
2. Откройте **Extensions → Apps Script**
3. Вставьте содержимое `scripts/setup-sheets.gs`
4. Запустите функцию `createPodraydProSheets()`
5. (Опционально) Запустите `insertTestData()` для тестовых данных
6. Скопируйте ID таблицы из URL: `https://docs.google.com/spreadsheets/d/ЭТОТ_ID/edit`

### 2. Telegram бот

1. Напишите [@BotFather](https://t.me/BotFather) команду `/newbot`
2. Сохраните токен бота
3. Создайте канал, добавьте бота администратором
4. Узнайте ID канала (перешлите сообщение из канала боту [@userinfobot](https://t.me/userinfobot))
5. Узнайте свой Telegram ID (напишите [@userinfobot](https://t.me/userinfobot))

### 3. n8n (выберите один вариант)

**Вариант A — n8n Cloud (быстрый старт):**

1. Зарегистрируйтесь на [n8n.cloud](https://n8n.cloud)
2. Для каждого файла из `workflows/`:
   - Откройте n8n → **Settings → Import from JSON**
   - Загрузите JSON файл
3. Настройте Credentials:
   - **Telegram API** — токен бота
   - **Google Sheets OAuth2** — сервисный аккаунт
   - **OpenAI API** — ключ API
4. Активируйте все workflows

**Вариант B — VPS (продакшн):**

```bash
# На сервере
cp .env.example .env
# Заполните .env

# Получить SSL сертификат (убедитесь что DNS уже указывает на сервер)
chmod +x scripts/init-ssl.sh
./scripts/init-ssl.sh

# Запустить
docker compose up -d
docker compose logs -f n8n
```

### 4. PWA деплой (Vercel)

```bash
cd podryad-pro
cp .env.local.example .env.local
# Заполните переменные в .env.local

npm install
npm run build
npx vercel deploy
```

## Переменные окружения

| Переменная | Описание | Где используется |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Токен от @BotFather | n8n workflows |
| `TELEGRAM_CHANNEL_ID` | ID канала (-100...) | n8n workflows |
| `TELEGRAM_ADMIN_ID` | Ваш Telegram ID | n8n workflows |
| `OPENAI_API_KEY` | Ключ OpenAI | n8n (парсинг, /pick) |
| `GOOGLE_SHEETS_ID` | ID таблицы из URL | n8n + Next.js |
| `GOOGLE_API_KEY` | Google Cloud API ключ | Next.js (чтение) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email сервисного аккаунта | n8n (запись в Sheets) |
| `GOOGLE_PRIVATE_KEY` | Приватный ключ сервисного аккаунта | n8n (запись в Sheets) |
| `N8N_WEBHOOK_BASE` | URL вебхуков n8n | Next.js |
| `N8N_DOMAIN` | Домен n8n | Docker + nginx |
| `YUKASSA_SHOP_ID` | ID магазина ЮKassa | n8n workflows |
| `YUKASSA_SECRET_KEY` | Секретный ключ ЮKassa | n8n workflows |

## Монетизация

| Услуга | Цена | Команда |
|---|---|---|
| Публикация заказа | 500 руб | Автоматически при создании |
| VIP подписка | 1 000 руб/мес | `/vip` |
| Подбор топ-3 | 1 000 руб | `/pick` |

## n8n Workflows

### 01 — Order Intake
Telegram Trigger → Switch команд → GPT-4o-mini парсинг → Nominatim геокодинг → Google Sheets → Ответ с кнопкой оплаты

### 02 — Publish Order
YuKassa webhook / Admin approve → Lookup заказа → Геоточка в канал → Пост с кнопками → Обновление статуса

### 03 — Handle Response
Callback query → Проверка статуса заказа → Проверка доступа воркера → Атомарная блокировка → Уведомления всем сторонам

### 04 — Rating System
/done команда → Определение роли → Запрос оценки (1-5) → Пересчёт рейтинга → Штрафы (предупреждение → 500р → бан 30 дней)

### 05 — Monetization
/vip → Проверка статуса → Оплата → Активация VIP (30 дней)
/pick → Фильтр топ воркеров → GPT рекомендация → Оплата → Контакты

### 06 — Daily Analytics
Cron 20:00 MSK → Чтение всех данных → Метрики → Отчёт админу в Telegram

## Troubleshooting

| Проблема | Решение |
|---|---|
| Бот не отвечает | Проверьте что Telegram Trigger активен в n8n |
| Геокодер не работает | Проверьте User-Agent в Nominatim запросе |
| Sheets не пишет | Проверьте OAuth2 credentials в n8n |
| PWA не ставится | Проверьте manifest.json и HTTPS |
| Webhook не приходит | Проверьте URL в настройках ЮKassa |
| n8n недоступен | Проверьте `docker compose logs nginx` |
| SSL не работает | Проверьте DNS A-запись, затем `./scripts/init-ssl.sh` |
| OpenAI rate limit | Увеличьте лимит в OpenAI Dashboard или добавьте retry |
| Оплата не проходит | Проверьте YUKASSA_SHOP_ID и YUKASSA_SECRET_KEY |

## Лицензия

Proprietary. All rights reserved.
