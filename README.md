# 🔨 Подряд PRO | Работа Омск

Платформа для поиска работы и подработки в Омске.
Telegram-бот + канал + PWA + n8n автоматизация.

## 📂 Структура проекта

```
podryad-pro/
├── workflows/                  ← 8 JSON файлов для n8n
│   ├── 01-order-intake.json    ← Приём заявок (Telegram)
│   ├── 02-publish-order.json   ← Публикация в канал
│   ├── 03-handle-response.json ← Отклики исполнителей
│   ├── 04-rating-system.json   ← Рейтинги и штрафы
│   ├── 05-monetization.json    ← VIP + подбор
│   ├── 06-daily-analytics.json ← Ежедневный отчёт
│   ├── 07-max-crosspost.json   ← Кросс-пост в MAX
│   └── 08-order-intake-pwa.json← Приём заявок (PWA форма)
├── google-apps-script/
│   └── createSheets.gs         ← Скрипт создания таблиц
├── pwa/                        ← Next.js 15 PWA
│   ├── src/
│   │   ├── app/               ← App Router pages
│   │   ├── components/        ← React компоненты
│   │   └── lib/               ← Утилиты
│   ├── public/
│   │   └── manifest.json
│   ├── package.json
│   └── next.config.js
├── docker/
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🚀 Быстрый старт

### Шаг 1: Google Sheets

1. Создай новую Google Таблицу
2. **Extensions → Apps Script**
3. Вставь код из `google-apps-script/createSheets.gs`
4. **Run → `createPodraydProSheets`** → подтверди доступ
5. Скопируй ID таблицы из URL:
   `https://docs.google.com/spreadsheets/d/ЭТОТ_ID/edit`
6. Включи Google Sheets API в [Google Cloud Console](https://console.cloud.google.com/)
7. Создай API Key с доступом к Sheets API

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

### Шаг 4: n8n Cloud (быстрый вариант)

1. Зарегистрируйся на [n8n.cloud](https://n8n.cloud/) (бесплатный trial)
2. Для каждого файла из `workflows/`:
   - **Settings → Import from File** → выбрать JSON
3. Настрой Credentials:
   - **Telegram API** → вставь токен бота
   - **Google Sheets** → OAuth2 или Service Account
   - **OpenAI** → API ключ
4. В каждом workflow замени переменные окружения на свои значения
5. **Activate** каждый workflow

### Шаг 5: PWA деплой (Vercel)

```bash
cd pwa
cp ../.env.example .env.local
# Отредактируй .env.local — заполни все переменные

npm install
npm run build
npm run dev          # Локально на :3000

# Деплой на Vercel:
npx vercel deploy
```

### Шаг 6: VPS деплой n8n (продакшен)

```bash
# На сервере:
cp .env.example .env
# Заполни .env

# Первый запуск (получить SSL):
docker-compose up -d nginx
docker-compose run --rm certbot

# Перезапуск с SSL:
docker-compose down
docker-compose up -d

# Логи:
docker-compose logs -f n8n
```

## ⚙️ Переменные окружения

| Переменная | Описание | Где взять |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Токен бота | @BotFather |
| `TELEGRAM_CHANNEL_ID` | ID канала (-100...) | @userinfobot |
| `TELEGRAM_ADMIN_ID` | Ваш Telegram ID | @userinfobot |
| `OPENAI_API_KEY` | Ключ OpenAI | platform.openai.com |
| `GOOGLE_SHEETS_ID` | ID таблицы | URL таблицы |
| `GOOGLE_API_KEY` | API ключ Google | Cloud Console |
| `N8N_WEBHOOK_BASE` | Базовый URL n8n | n8n.cloud или свой VPS |
| `YUKASSA_SHOP_ID` | ID магазина ЮKassa | yookassa.ru |
| `YUKASSA_SECRET_KEY` | Секретный ключ | yookassa.ru |
| `NEXT_PUBLIC_BOT_NAME` | Username бота | Podryad_PRO_bot |

## 🔄 Как работает система

```
Заказчик пишет боту
        ↓
[Workflow 1] GPT парсит текст → геокодинг → сохранение в Sheets
        ↓
Заказчик оплачивает 500₽
        ↓
[Workflow 2] Пост с картой в канал
        ↓
Исполнитель жмёт "Готов"
        ↓
[Workflow 3] Проверка доступа → блокировка заказа → уведомления обоим
        ↓
Работа выполнена → /done
        ↓
[Workflow 4] Опрос → рейтинг → штрафы если нужно
        ↓
[Workflow 6] Ежедневный отчёт админу в 20:00
```

## 💰 Монетизация

- **500₽** — публикация заказа
- **1 000₽/мес** — VIP подписка (ранний доступ к заказам)
- **1 000₽** — подбор ТОП-3 исполнителей (/pick)
- **Реклама** — платные посты от подрядчиков

## 🛠 Troubleshooting

| Проблема | Решение |
|---|---|
| Бот не отвечает | Проверь что Telegram Trigger активен в n8n |
| Геокодер не работает | Проверь User-Agent в Nominatim запросе |
| Sheets не пишет | Проверь OAuth2/Service Account credentials |
| PWA не ставится | Проверь manifest.json и что сайт на HTTPS |
| Карта не показывается | Проверь что `leaflet` CSS подключен |
| n8n webhook 404 | Проверь что workflow активирован |

## 📝 TODO на будущее

- [ ] Подключить боевую ЮKassa (сейчас заглушка через /approve)
- [ ] Telegram Mini App вместо PWA
- [ ] Push-уведомления через Service Worker
- [ ] Автоматическое продление VIP
- [ ] Серия штрафов (трекинг последних 3 оценок)
- [ ] Admin panel (React dashboard)
- [ ] Миграция с Google Sheets на PostgreSQL при масштабировании

## 📄 Лицензия

Частный проект. Все права защищены.
