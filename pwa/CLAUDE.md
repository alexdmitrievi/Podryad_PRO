# Подряд PRO

## Стек
Next.js 15 App Router, Supabase (PostgreSQL), Tailwind CSS, ЮKassa, n8n webhooks, OpenAI GPT-4o

## Бизнес-модель
Скрытая наценка. Заказчик видит display_price. Исполнитель получает base_price (100%). Площадка бесплатна для исполнителей.

## Flow
1. Заказчик → лендинг → заявка (форма 152-ФЗ) → POST /api/leads → n8n → MAX
2. Мы создаём заказ в Supabase → ссылка на оплату /order/[id]/pay → ЮKassa эскроу
3. Деньги холдируются → работа → обе стороны подтверждают /order/[id]/confirm
4. capture + выплата (yookassa_payout / manual_transfer / cash)

## API маршруты
- `/api/leads` — публичная форма, POST, создаёт лид + геокод через Nominatim
- `/api/orders` — создание заказа через старую форму
- `/api/orders/create` — создание заказа через новые формы (рабочие / техника)
- `/api/orders/public` — GET, публичная лента заказов для дашборда исполнителей
- `/api/orders/respond` — POST, отклик исполнителя на заказ
- `/api/orders/my` — GET, заказы заказчика по access_token
- `/api/orders/[id]/confirm` — POST, подтверждение выполнения (обе стороны)
- `/api/orders/[id]/dispute` — POST/PATCH, открытие / решение спора
- `/api/contractors` — POST, регистрация исполнителя
- `/api/catalog-orders` — POST, заказ из каталога
- `/api/listings/public` — GET, публичный каталог товаров/услуг
- `/api/payments/create-escrow` — POST, создание эскроу платежа
- `/api/payments/callback` — POST, вебхук от ЮKassa
- `/api/my/recover` — POST, восстановление ссылки по телефону
- `/api/cron/capture-expired` — POST, авто-capture просроченных эскроу
- `/api/admin/*` — все админские эндпоинты, защищены PIN через x-admin-pin header

## Правила
- base_price, markup_percent — НИКОГДА в публичных API
- display_price — единственная цена для заказчика
- Чекбокс 152-ФЗ обязателен в формах с ПД
- Шрифт: Manrope. Основные цвета: brand-500 (#2F5BFF), brand-900 (#1E2A5A), violet (#6C5CE7), accent (#FF6B35)
- MAX — основной мессенджер, Telegram — резервный
- **Email НЕ является каналом коммуникации** — только Telegram, MAX, Avito
- `pwa/src/lib/channels/` — нормализованный multi-channel слой (Telegram, MAX, Avito)
- `pwa/src/lib/ai/` — OpenAI GPT-4o клиент (LLM для RAG-агента)
- Админские API используют timing-safe PIN через заголовок x-admin-pin
- Публичные API используют анонимный Supabase клиент, админские — service role
