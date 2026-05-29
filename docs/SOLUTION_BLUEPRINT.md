# Подряд PRO — Solution Blueprint

Шаблон маркетплейса услуг для мессенджеров. Этот документ описывает ВСЁ что нужно чтобы:
1. **Понять** как устроена система
2. **Развернуть** копию с нуля
3. **Адаптировать** под другую бизнес-нишу

---

## 1. Product Overview

**Что это:** маркетплейс строительных услуг с заказом через чат-ботов Telegram + MAX.

**Бизнес-модель:** скрытая наценка. Заказчик видит `display_price` (цена с наценкой). Исполнитель получает `supplier_payout` (базовая цена). Платформа зарабатывает на разнице. Исполнителям — бесплатно.

**Каналы привлечения:**
- Чат-бот Telegram (`@Podryad_PRO_bot`) — основной канал заказов
- Чат-бот MAX — вторичный канал
- PWA сайт — лендинг + каталог + админ-панель
- Реферальная система — вирусный рост

**User flow:**
```
Клиент → /start в боте → выбор услуги → уточнение параметров → подтверждение
        → заявка создана → уведомление админу → ручной подбор исполнителя
        → оплата (СБП/счёт) → выполнение → подтверждение → бонусы
```

---

## 2. Complete Tech Stack

| Слой | Технология | Версия | Почему |
|------|-----------|--------|--------|
| **Фронтенд** | Next.js App Router | 15.5 | SSR + API routes в одном фреймворке |
| **База данных** | Supabase (PostgreSQL) | последняя | Managed PG с REST API + RLS + Realtime |
| **Стили** | Tailwind CSS | 3.x | Utility-first, быстро |
| **Telegram Bot SDK** | Прямые HTTP-запросы к Bot API | — | Меньше зависимостей, полный контроль |
| **MAX Bot SDK** | `@maxhub/max-bot-api` | 0.2.x | Официальный SDK с long-polling |
| **AI (опционально)** | OpenAI GPT-4o | — | Для свободных сообщений в ботах |
| **Автоматизация** | n8n | 1.89.2 | Визуальные воркфлоу, 8 активных |
| **Web-сервер** | nginx (Docker) | alpine | Reverse proxy, SSL |
| **SSL** | Let's Encrypt + certbot | — | Авто-renew каждые 12 часов |
| **Process manager** | PM2 | 7.x | Управление Node.js процессами |
| **CI/CD** | Vercel + GitHub Actions | — | Авто-деплой при пуше |
| **Мониторинг** | Cron + PM2 health | — | Авто-рестарт PWA каждые 4 часа |

---

## 3. Codebase Map

```
├── pwa/                          # Progressive Web App (Next.js 15)
│   ├── src/
│   │   ├── app/                  # App Router страницы + API
│   │   │   ├── api/
│   │   │   │   ├── telegram/webhook/route.ts   # Telegram webhook handler
│   │   │   │   ├── max/webhook/route.ts        # MAX webhook handler
│   │   │   │   ├── health/bot/route.ts         # Health check ботов
│   │   │   │   ├── orders/public/route.ts      # Публичная карта заказов
│   │   │   │   └── admin/                      # Админские API
│   │   │   ├── page.tsx          # Главный лендинг (5 карточек услуг)
│   │   │   ├── own-park/page.tsx # «Выгодно от Подряд PRO» — каталог услуг+материалов
│   │   │   ├── catalog/[category]/page.tsx     # Каталог (labor/equipment/materials)
│   │   │   └── admin/page.tsx    # Админ-панель (PIN-защита)
│   │   ├── components/           # React-компоненты
│   │   │   ├── LiveOrdersMap.tsx # Интерактивная карта заказов
│   │   │   ├── MaterialsForm.tsx # Форма заказа материалов
│   │   │   └── MaterialsSection.tsx # Секция материалов на лендинге
│   │   └── lib/
│   │       ├── bot/              # Бизнес-логика ботов
│   │       │   ├── funnel-handler.ts  # 🔥 ГЛАВНЫЙ ФАЙЛ — воронка заказа (1148 строк)
│   │       │   ├── funnel-state.ts    # UI-тексты, цены, лейблы (501 строка)
│   │       │   ├── keyboards.ts       # Все клавиатуры ботов (441 строка)
│   │       │   ├── context.ts         # resolveBotContext — единый RPC для контакта
│   │       │   ├── session.ts         # Управление состоянием сессии
│   │       │   ├── order-flow.ts      # Создание заказа — RPC confirm_bot_order
│   │       │   ├── loyalty.ts         # Реферальная система + бонусы
│   │       │   └── types.ts           # TypeScript типы (BotServiceKind, MaterialKind, SessionState)
│   │       ├── channels/         # Multi-channel абстракция
│   │       │   ├── types.ts           # Интерфейсы: ChannelTransport, ChannelMapper, MessageButton
│   │       │   ├── router.ts          # ChannelRouter — единый диспетчер
│   │       │   ├── telegram.ts        # TelegramTransport + TelegramMapper
│   │       │   ├── max.ts             # MaxTransport + MaxMapper
│   │       │   ├── config.ts          # Channel config из env vars
│   │       │   └── dedupe.ts          # Защита от дублей webhook-обновлений
│   │       └── job-queue.ts      # Очередь задач для n8n
│   ├── public/
│   │   ├── tg-app.html          # Telegram Mini App
│   │   └── max-app.html         # MAX Mini App
│   └── .env.local               # Переменные окружения (НЕ КОММИТИТСЯ)
│
├── scripts/                      # Вспомогательные скрипты
│   ├── max-sdk-bot.mjs          # MAX бот на официальном SDK (PM2)
│   ├── max-bot.mjs              # Старая версия MAX бота
│   ├── max-bot.cjs              # Старая версия (CommonJS)
│   ├── telegram-poll.cjs        # Telegram long-poll proxy (ОСТАНОВЛЕН)
│   ├── register-webhooks.mjs    # Регистрация вебхуков Telegram + MAX
│   └── run-migrations.mjs       # Применение миграций Supabase
│
├── supabase/                     # База данных
│   ├── schema.sql               # Полная схема БД
│   └── migrations/              # Инкрементальные миграции
│       ├── 033_bot_core.sql     # Ядро: bot_sessions, job_queue
│       ├── 034_bot_contacts.sql # Контакты + идентификации
│       ├── 036_loyalty_referrals.sql # Рефералы + лояльность (367 строк)
│       ├── 050_confirm_bot_order_rpc.sql # Создание заказа (одна RPC)
│       └── 051_resolve_bot_context.sql  # Контекст бота (одна RPC)
│
├── docker/                       # Docker-конфигурация
│   ├── nginx.conf               # 🔥 Конфиг nginx (reverse proxy)
│   └── docker-compose.yml       # n8n + nginx + certbot
│
├── n8n/workflows/               # Воркфлоу автоматизации
│   └── *.json                   # 8 активных воркфлоу
│
└── packages/contracts/          # Shared Zod-схемы
    └── src/channels.ts          # Нормализованные типы сообщений
```

---

## 4. Database Schema — Core Tables

### 4.1 Основные таблицы

| Таблица | Назначение | Ключевые поля |
|---------|-----------|---------------|
| `bot_contacts` | Пользователи ботов | id, full_name, phone, region, customer_type, loyalty_tier |
| `bot_contact_identities` | Связь контакта с мессенджером | contact_id, channel, external_id |
| `bot_sessions` | Состояние воронки | chat_id, channel, funnel, step, state (JSONB) |
| `bot_leads` | Заявки / заказы | contact_id, service_kind, status, area_value, district |
| `bot_services` | Справочник услуг | id, kind, label, price_range |
| `bot_messages` | Архив сообщений | contact_id, lead_id, channel, direction, text |
| `referrals` | Реферальные связи | referrer_contact_id, invitee_contact_id, status (pending/qualified) |
| `referral_codes` | Коды рефералов | contact_id, code (6 символов) |
| `loyalty_balances` | Бонусный баланс | contact_id, bonus_rub |
| `loyalty_events` | История бонусов | contact_id, delta_rub, reason |
| `job_queue` | Очередь задач для n8n | job_type, status, payload, queue_name |
| `orders` | Заказы на карте | order_number, address, lat, lon, status, work_type |
| `events` | Аудит-лог | type, contact_id, channel, payload |
| `app_logs` | Логи приложения | level, source, message, context |

### 4.2 Ключевые RPC функции

| RPC | Назначение | Файл миграции |
|-----|-----------|--------------|
| `resolve_bot_context` | Получить контакт + сессию + профиль (1 вызов вместо 3) | 051 |
| `confirm_bot_order` | Создать заказ + списать бонусы + очистить сессию | 050 |
| `update_bot_session` | Сохранить состояние воронки | 040 |
| `ensure_referral_code` | Создать/получить реферальный код | 036 |
| `record_referral_visit` | Записать реферальный переход (возвращает ИМЯ реферера) | 036/052 |
| `qualify_referral` | Активировать реферал + начислить бонусы | 036 |
| `grant_bonus` | Начислить бонус на счёт | 036 |
| `claim_jobs` | Забрать задачи из очереди (для n8n) | 027 |

### 4.3 Типы перечислений (ENUMs)

```sql
messenger_channel: 'telegram', 'max', 'whatsapp', 'avito'
referral_status: 'pending', 'qualified', 'expired'
bot_service_kind: 'lawn_mowing', 'weed_removal', 'debris_removal', 'land_clearing',
                  'tree_cutting', 'tilling', 'pool_cleaning', 'welding',
                  'scarification', 'aeration', 'pool_assembly', 'pool_maintenance'
material_kind: 'concrete', 'crushed_stone', 'sand', 'cement', 'brick'
region_name: 'omsk', 'novosibirsk'
customer_type: 'b2c', 'b2b'
loyalty_tier: 'standard', 'vip', 'partner'
```

---

## 5. API Routes — Complete Catalog

### 5.1 Публичные API

| Method | Route | Назначение |
|--------|-------|-----------|
| `POST` | `/api/leads` | Создание лида (форма 152-ФЗ) |
| `GET` | `/api/orders/public` | Карта заказов (фильтр по статусу + координатам) |
| `GET` | `/api/orders/[id]` | Детали заказа по ID |
| `GET` | `/api/listings/public` | Каталог товаров/услуг |

### 5.2 Webhook-эндпоинты ботов

| Method | Route | Назначение |
|--------|-------|-----------|
| `POST` | `/api/telegram/webhook` | Обработчик сообщений Telegram |
| `POST` | `/api/max/webhook` | Обработчик сообщений MAX |

### 5.3 Health / Admin

| Method | Route | Назначение |
|--------|-------|-----------|
| `GET` | `/api/health/bot` | Проверка обоих ботов (getMe + webhookInfo) |
| `GET` | `/api/health` | Общая проверка (Supabase + Redis) |
| `POST` | `/api/admin/verify-pin` | Проверка админ-PIN |
| `PATCH` | `/api/admin/orders/[id]` | Изменение статуса заказа |

### 5.4 Cron (внутренние)

| Method | Route | Триггер | Назначение |
|--------|-------|---------|-----------|
| `GET` | `/api/cron/jobs` | Каждые 30с | Обработка очереди задач |
| `GET` | `/api/cron/analytics` | Ежедневно | Сбор аналитики |
| `GET` | `/api/cron/crosspost` | Ежедневно | Кросспостинг |
| `GET` | `/api/cron/max-poll` | Ежедневно | MAX-поллинг (резерв) |

---

## 6. Bot Funnel — State Machine

### 6.1 Полная воронка заказа услуги

```
/start
  ↓
Выбор региона          → state.region = 'omsk' | 'novosibirsk'
  ↓
Тип клиента            → state.customerType = 'b2c' | 'b2b'
  ↓
Главное меню           → screen = 'home'
  ├─ 📝 Описать задачу  → quick_order (свободный текст → парсинг → заказ)
  ├─ 🛠 Услуги          → services_menu
  │   ├─ 🌱 Покос газона     → svc:lawn_mowing
  │   ├─ 🌾 Удаление сорняков → svc:weed_removal
  │   ├─ 🚮 Вывоз мусора     → svc:debris_removal
  │   └─ ... (12 услуг)
  ├─ 🧱 Материалы       → material_menu
  │   ├─ 🪨 Щебень       → mat:crushed_stone
  │   ├─ 🌾 Песок        → mat:sand
  │   └─ ... (5 материалов)
  ├─ 🎁 Рефералы        → referral screen (ссылка + статистика)
  └─ 📋 Мои заказы      → список заказов пользователя

Выбор услуги            → screen = 'order', state.serviceKind = 'lawn_mowing'
  ↓
Выбор площади           → area:lawn_mowing:5  (5, 10, 20, 50, 100 соток)
  ↓
Выбор района            → district:omsk_center (Омск: 5 районов / Новосибирск: при регионе)
  ↓
Выбор времени           → when:asap | when:today | when:tomorrow | when:week
  ↓
Подтверждение           → confirm:yes
  ├─ ✅ Успех: заявка создана → описание + контакты админа
  └─ ❌ Ошибка: «Данные заказа утеряны» → возврат в services_menu
```

### 6.2 Состояние сессии (SessionState)

```typescript
interface SessionState {
  screen: Screen;           // текущий экран воронки
  region: RegionCode;       // 'omsk' | 'novosibirsk'
  customerType: CustomerType; // 'b2c' | 'b2b'
  serviceKind?: BotServiceKind;  // выбранная услуга
  area?: number;            // площадь
  areaUnit?: string;        // единица измерения
  district?: string;        // район
  whenLabel?: string;       // текст выбранного времени
  whenHuman?: string;       // человекочитаемое время
  description?: string;     // описание для quick_order
  referredBy?: string;      // реферальный код
  discountPercent?: number; // скидка лояльности
  bonusRub?: number;        // доступные бонусы
  navStack?: string[];      // история навигации
}
```

### 6.3 Ключевое правило: каждый шаг = один callback

```
Кнопка → callback_data → handleCallback → setSessionState → return { text, buttons }
                                                                    ↓
                                              TelegramTransport / tgSend → пользователь
```

---

## 7. Channel Abstraction Layer

### 7.1 Архитектура

```
Webhook (Telegram/MAX)
    │
    ▼
ChannelMapper.normalize()  →  NormalizedIncomingEvent { channel, type, user_id, chat_id, text }
    │
    ▼
Route handler (fast-path или funnel)
    │
    ▼
ChannelRouter.send()  →  ChannelTransport.send()  →  Platform API
                              │
                    ┌─────────┼─────────┐
                    │         │         │
              Telegram    MAX       Avito
              Transport   Transport Transport
```

### 7.2 Ключевые интерфейсы

```typescript
// Универсальное входящее сообщение
interface NormalizedIncomingEvent {
  channel: 'telegram' | 'max';
  type: 'message' | 'command' | 'callback';
  user_id: string;
  chat_id: string;
  text: string;
}

// Универсальное исходящее сообщение
interface NormalizedOutgoingMessage {
  channel: 'telegram' | 'max';
  chat_id: string;
  text: string;
  buttons?: MessageButton[][];
}

// Кнопка
interface MessageButton {
  type: 'url' | 'callback' | 'web_app';
  text: string;
  url?: string;
  callback_data?: string;
  web_app_url?: string;
}
```

### 7.3 Как адаптировать под новый канал

1. Создать `new-channel.ts` с `NewChannelMapper` + `NewChannelTransport`
2. Зарегистрировать в `router.ts` → `this.transports.set('newchannel', new NewChannelTransport())`
3. Добавить webhook-роут в `app/api/newchannel/webhook/route.ts`
4. Всё — бизнес-логика (`funnel-handler.ts`) работает без изменений

---

## 8. Referral & Loyalty System

### 8.1 Полная схема

```
User A (реферер)                 User B (приглашённый)
     │                                  │
     ├─ «🎁 Друзьям +500 ₽»            │
     ├─ ensure_referral_code()          │
     ├─ Код: "A3F8B2"                   │
     ├─ Ссылка:                         │
     │  t.me/Podryad_PRO_bot           │
     │  ?start=ref_A3F8B2              │
     │                                  │
     │  ───делится ссылкой──→           │
     │                                  ├─ /start ref_A3F8B2
     │                                  ├─ record_referral_visit()
     │                                  ├─ referrals: pending
     │                                  └─ «Вас пригласил [Имя]!»
     │                                       ↓
     │                                  ├─ Оформляет заказ
     │                                  └─ Заказ выполнен (status=done)
     │                                       ↓
     ├─ trigger: tg_qualify_referral_on_done
     ├─ referrals: qualified
     ├─ grant_bonus(A, 500, referral_qualified)  ← +500₽ рефереру
     └─ grant_bonus(B, 500, referral_qualified)  ← +500₽ другу
```

### 8.2 Конфигурация

| Параметр | Значение | Где менять |
|----------|---------|-----------|
| Бонус за реферала | 500 ₽ | `qualify_referral` RPC |
| Макс. бонус на заказ | 500 ₽ | `order-flow.ts:75` PER_ORDER_BONUS_CAP |
| Длина кода | 6 символов | `ensure_referral_code` RPC |
| Скидка лояльности | 5% (1 заказ), 10% (2+) | `compute_discount_for_contact` RPC |

### 8.3 Кнопки рефералов в интерфейсе

- **B2C меню**: «🎁 Друзьям +500 ₽» → `menu:referral`
- **B2B меню**: «🎁 Партнёрам» → `menu:referral`
- **При реферальном переходе**: «📢 Подписаться на канал — активировать 500 ₽» → `t.me/podryad_pro`
- **Экран реферала**: ссылка + статистика + кнопка «📢 Наш канал»

---

## 9. Infrastructure Playbook

### 9.1 VPS: минимальные требования

| Ресурс | Минимум | Рекомендация |
|--------|---------|-------------|
| RAM | 2 GB | 4 GB |
| CPU | 1 vCPU | 2 vCPU |
| Диск | 20 GB | 40 GB |
| OS | Ubuntu 22.04 LTS | |

### 9.2 PM2 — управление процессами

```bash
# PWA
NODE_OPTIONS="--max-old-space-size=1024" pm2 start npm --name pwa -- start

# MAX бот
pm2 start /root/podryad-pro/scripts/max-sdk-bot.mjs --name max-bot

# Автостарт при ребуте
pm2 startup
pm2 save
```

### 9.3 Docker Compose — сервисы

```yaml
services:
  n8n:     # n8nio/n8n:1.89.2, порт 127.0.0.1:5678
  nginx:   # nginx:alpine, порты 80, 443
  certbot: # certbot/certbot, auto-renew каждые 12 часов
```

### 9.4 Nginx — конфигурация

- **podryadpro.ru** → `proxy_pass http://172.17.0.1:3000` (PWA)
- **n8n.podryadpro.ru** → `proxy_pass http://n8n:5678` (n8n)
- **HTTP → HTTPS**: редирект 301
- **SSL**: Let's Encrypt, валидность 90 дней, авто-renew
- **Таймаут**: `proxy_read_timeout 120s` (для медленных RPC)
- **MAX API proxy**: `/proxy/max/` → `platform-api.max.ru`

### 9.5 Cron

```
0 0,4,8,12,16,20 * * * /root/pwa-restart.sh
# Скрипт перезапускает PWA + nginx каждые 4 часа
```

### 9.6 Firewall (UFW)

```bash
ufw enable
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
```

---

## 10. Deployment — New Instance Guide

### 10.1 Последовательность развёртывания

1. **VPS**: арендовать, установить Ubuntu 22.04, Docker, Node.js 20+
2. **Supabase**: создать проект, применить миграции: `node scripts/run-migrations.mjs`
3. **Домен**: купить, направить A-запись на IP VPS
4. **SSL**: `docker-compose run --rm certbot certonly --standalone -d domain.ru`
5. **Код**: `git clone`, `npm install`, `npm run build`
6. **PM2**: запустить PWA + MAX бота
7. **Telegram**: создать бота через @BotFather, зарегистрировать вебхук
8. **MAX**: создать бота через MasterBot, запустить SDK-бота
9. **n8n**: импортировать воркфлоу из `n8n/workflows/`
10. **Cron**: настроить авто-рестарт

### 10.2 Переменные окружения (.env)

| Переменная | Назначение |
|-----------|-----------|
| `NEXT_PUBLIC_APP_URL` | URL продакшена |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Ключ service_role |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота |
| `TELEGRAM_WEBHOOK_SECRET` | Секрет вебхука |
| `TELEGRAM_BOT_USERNAME` | Username бота (для реферальных ссылок) |
| `MAX_BOT_TOKEN` | Токен MAX бота |
| `MAX_API_BASE` | `https://platform-api.max.ru` |
| `NEXT_PUBLIC_MAX_CHANNEL_LINK` | Ссылка на канал MAX |
| `OPENAI_API_KEY` | Ключ OpenAI (опционально) |
| `ADMIN_PIN` | PIN админ-панели |
| `CRON_SECRET` | Секрет для cron-эндпоинтов |

---

## 11. ⚡ Adaptation Guide — Как адаптировать под другой бизнес

### 11.1 Что МЕНЯТЬ под конкретного заказчика

| Что | Где | Как |
|-----|-----|-----|
| **Названия услуг** | `funnel-state.ts:SERVICE_LABEL` | Словарь: kind → название |
| **Цены услуг** | `funnel-state.ts:PRICE_RANGE` | min/max цена за единицу |
| **Иконки услуг** | `funnel-state.ts:SERVICE_EMOJI` | Эмодзи для каждой услуги |
| **Названия материалов** | `funnel-state.ts:MATERIAL_LABEL` | Словарь: kind → название |
| **Марки материалов** | `funnel-state.ts:MATERIAL_GRADES` | Для бетона, щебня и т.д. |
| **Регионы** | `funnel-state.ts:REGION_LABEL` | Города/районы |
| **Районы внутри города** | `funnel-state.ts:DISTRICT_LABEL` | Административные районы |
| **Единицы измерения** | `funnel-state.ts:MATERIAL_UNIT` | м³, т, шт, меш |
| **Тексты UI** | `funnel-state.ts:UI.*` | Все сообщения бота |
| **Цвета бренда** | `page.tsx:brand-500/brand-900/violet` | Заменить HEX-значения |
| **Название компании** | `funnel-state.ts:BRAND_NAME` + `page.tsx:title` | Везде в UI |
| **Логотип** | `public/logo.png` | Заменить файл |
| **Telegram канал** | `funnel-handler.ts + keyboards.ts` | `t.me/your_channel` |
| **Посты в канале** | Telegram админ-панель | Заменить контент |

### 11.2 Что НЕ МЕНЯТЬ (универсальное)

- Вся воронка заказа (state machine)
- Channel abstraction layer
- Реферальная система + лояльность
- Инфраструктура (VPS, Docker, PM2, nginx)
- n8n автоматизация (схема воркфлоу)
- База данных (схема, RPC)
- Админ-панель
- Мини-приложения

### 11.3 Пример: адаптация под клинику

```typescript
// funnel-state.ts → меняем 3 места:
SERVICE_LABEL = {
  consultation: 'Консультация врача',
  diagnostics:  'Диагностика',
  surgery:      'Хирургия',
  dentistry:    'Стоматология',
};
PRICE_RANGE = { consultation: { min: 1500, max: 3000 }, ... };
// Регионы: msk, spb, ekb
// Бота: @ClinicName_bot, токен клиники
// Домен: clinic.ru
// Всё. Остальной код НЕ трогаем.
```

### 11.4 Контрольный список для нового проекта

- [ ] Заменить названия услуг в `SERVICE_LABEL`
- [ ] Заменить цены в `PRICE_RANGE`
- [ ] Заменить регионы в `REGION_LABEL`
- [ ] Заменить имя бота (везде: `TELEGRAM_BOT_USERNAME`, ссылки)
- [ ] Заменить токены ботов
- [ ] Заменить домен (`.env`, nginx, SSL)
- [ ] Заменить логотип + цвета бренда
- [ ] Создать Supabase проект + применить миграции
- [ ] Настроить n8n коннекторы
- [ ] Протестировать полную воронку

**Время на адаптацию:** 2-4 часа (из них 80% — копирование и замена строк).

---

## 12. Known Issues & Workarounds

| # | Проблема | Workaround | Статус |
|---|---------|-----------|--------|
| 1 | PWA OOM краши при 1.5GB+ RAM | Cron рестарт каждые 4 часа | Временный |
| 2 | Telegram secret check не работает | Отключён (Next.js кеширует env) | Временный |
| 3 | Double-JSON-encode в сессиях | Защитный parse перед stringify | ✅ Исправлен |
| 4 | n8n IPv6 ENETUNREACH | System-level IPv6 disable | ✅ Исправлен |
| 5 | nginx keep-alive после рестарта PWA | Cron рестартует nginx вместе с PWA | ✅ Workaround |

---

> **Версия документа:** 1.0, май 2026
> **Актуально для:** Подряд PRO (строительные услуги, Омск + Новосибирск)
> **Следующий шаг:** адаптировать под другую вертикаль по разделу 11
