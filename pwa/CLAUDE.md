# Подряд PRO

## Стек
Next.js 15 App Router, Supabase (PostgreSQL), Tailwind CSS, ЮKassa, n8n webhooks, OpenAI GPT-4o

## Бизнес-модель
Скрытая наценка. Заказчик видит display_price. Исполнитель получает supplier_payout (≈ base_price). Площадка бесплатна для исполнителей. Платёжный шлюз (ЮKassa) удалён в апреле 2026 — используется ручная оркестрация (СБП, счёт, наличные).

## Flow
1. Заказчик → лендинг → заявка (форма 152-ФЗ) → POST /api/leads → n8n → MAX
2. Мы создаём заказ в Supabase → admin оценивает → payment_status = invoice_sent
3. Заказчик оплачивает вручную (СБП / счёт) → admin ставит payment_status = paid
4. Работа выполняется → обе стороны подтверждают /api/orders/[id]/confirm → status = confirming
5. Admin выплачивает исполнителю (СБП/наличные) → executor_payout_status = paid → status = completed

## Статусы заказа
pending → priced → payment_sent → paid → in_progress → confirming → completed
                                                        ↘ disputed ↗ (admin решает через PATCH /dispute)
cancelled (отмена), published (в ленте), closed (архив), done (устаревший алиас completed)

## API маршруты
- `/api/leads` — публичная форма, POST, создаёт лид + геокод через Nominatim
- `/api/orders` — создание заказа через старую форму (устаревший)
- `/api/orders/create` — создание заказа через новые формы (рабочие / техника)
- `/api/orders/public` — GET, публичная лента заказов для карты исполнителей
- `/api/orders/respond` — POST, отклик исполнителя на заказ
- `/api/orders/my` — GET, заказы заказчика по access_token
- `/api/orders/[id]/confirm` — POST, подтверждение выполнения (обе стороны)
- `/api/orders/[id]/dispute` — POST/PATCH, открытие / решение спора
- `/api/contractors` — POST, регистрация исполнителя
- `/api/catalog-orders` — POST, заказ из каталога
- `/api/listings/public` — GET, публичный каталог товаров/услуг
- `/api/my/recover` — POST, восстановление ссылки по телефону (rate-limited: 3 req/10 min)
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
