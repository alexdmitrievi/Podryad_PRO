# Подряд PRO

## Стек
Next.js 15 App Router, Supabase (PostgreSQL), Tailwind CSS, n8n webhooks, OpenAI GPT-4o

## Архитектура
```
webhook → route handler → validation → channel router → transport → platform API
                ↕
         funnel handler → Supabase RPC → session/order state
```

**Ключевое правило**: route handlers остаются тонкими. Бизнес-логика — в `lib/bot/`. 
Каналы (Telegram/MAX/Avito) — через `lib/channels/` (адаптеры + роутер).

## Бизнес-модель
Скрытая наценка. Заказчик видит display_price. Исполнитель получает supplier_payout. 
Платформа бесплатна для исполнителей. Оплата — ручная оркестрация (СБП, счёт, наличные).

## Flow заказа
1. Заказчик → лендинг → заявка (152-ФЗ) → POST /api/leads → n8n → MAX
2. Создание заказа в Supabase → admin оценивает → payment_status = invoice_sent
3. Оплата вручную (СБП/счёт) → admin: payment_status = paid
4. Работа → подтверждение обеих сторон → status = confirming
5. Выплата исполнителю → executor_payout_status = paid → status = completed

## Статусы заказа
pending → priced → payment_sent → paid → in_progress → confirming → completed
                                                        ↘ disputed ↗ (admin)
cancelled | published | closed | done (= completed)

## Правила
- base_price, markup_percent — НИКОГДА в публичных API
- display_price — единственная цена для заказчика
- 152-ФЗ чекбокс обязателен в формах с ПД
- Шрифт: Manrope. Цвета: brand-500 (#2F5BFF), brand-900 (#1E2A5A), violet (#6C5CE7), accent (#FF6B35)
- MAX — основной мессенджер, Telegram — резервный
- Email НЕ канал коммуникации — только Telegram, MAX, Avito
- `pwa/src/lib/channels/` — multi-channel слой
- `pwa/src/lib/bot/` — бизнес-логика ботов (funnel, keyboards, context)
- `pwa/src/lib/ai/` — OpenAI GPT-4o клиент
- Админские API: PIN через x-admin-pin header (timing-safe)
- Публичные API: анонимный Supabase клиент

## Инфраструктура
- **PWA**: Next.js 15 на VPS (PM2, порт 3000), авто-рестарт каждые 4 часа (cron)
- **MAX бот**: официальный SDK (`@maxhub/max-bot-api`) через long-polling (PM2)
- **Telegram бот**: вебхук на `podryadpro.ru/api/telegram/webhook`
- **nginx**: reverse proxy podryadpro.ru → localhost:3000, SSL через Let's Encrypt
- **n8n**: docker-контейнер на `n8n.podryadpro.ru`, воркфлоу обработки
- **Supabase**: PostgreSQL (project: rnqalafmuyrlfioqdore)

## Боты — критические точки
- **MAX**: SDK bot должен работать всегда. При проблемах — проверить PM2 (`pm2 list | grep max-bot`)
- **Telegram**: вебхук должен быть на podryadpro.ru. Secret bypass включён (Next.js кеширует build-time env)
- **Память PWA**: при утечке → авто-рестарт cron'ом. Норма: 50-200MB. Критично: >1GB
- **Telegram callback'и**: проходят через funnel handler → Supabase RPC. Если RPC падает → fallback `⏳ Загружаю меню...`

## Shared Contracts
Общие Zod-схемы в `packages/contracts/src/channels.ts`:
- `NormalizedIncomingEvent` — нормализованное входящее сообщение
- `NormalizedOutgoingMessage` — нормализованное исходящее сообщение
- `SendResult` — результат отправки
- `MessageButton` — кнопка

## Контакты
- Admin: владелец проекта (Telegram: @ipzhbankov)
- Supabase: project `rnqalafmuyrlfioqdore`
- VPS: root@89.124.122.12
- Домен: podryadpro.ru
