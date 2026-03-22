# n8n workflows и Supabase (PostgreSQL)

JSON-файлы в этой папке изначально настроены на **Google Sheets** (ноды `n8n-nodes-base.googleSheets`).  
Проект переведён на **Supabase** — данные заказов, исполнителей, тарифов и т.д. хранятся в PostgreSQL.

## Какие сценарии остаются обязательными

Ниже — **не** кандидаты на удаление; их нужно **сохранить и мигрировать с Sheets на Supabase**:

| Файл | Сценарий |
|------|----------|
| `02-publish-order.json` | Оплата (ЮKassa) и публикация заказа в канал |
| `05-monetization.json` | VIP, `/pick`, платежи монетизации |
| `07-max-crosspost.json` | Кросс-пост в **MAX** (MAX остаётся в продукте) |
| `09-equipment-rental.json` | **Аренда техники** и колбэки оплаты аренды |

Остальные workflow (`01`, `03`, `04`, `06`, `08` и т.д.) — по вашей логике бота и PWA; их тоже переводите на SQL, если сценарии используются.

## Что сделать при развёртывании n8n

1. **Установите креды Supabase** (не Google):
   - **HTTP Header Auth** или переменные: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (для записи с сервера) либо **Supabase** community node, если используете его.
   - Для чтения «опубликованных» заказов с клиента — `anon` + RLS; для сценариев бота обычно нужен **service role** (храните только на сервере n8n).

2. **Замените ноды Google Sheets** на один из вариантов:
   - **HTTP Request** к [PostgREST](https://postgrest.org/):  
     `{{ $env.SUPABASE_URL }}/rest/v1/<table>`  
     Заголовки: `apikey: <anon или service>`, `Authorization: Bearer <тот же ключ>`, `Content-Type: application/json`, `Prefer: return=representation`.
   - Или нода **Postgres** с connection string из Supabase (**Settings → Database**).
   - Или официальная/сообщества **Supabase** node для n8n.

3. **Соответствие листов и таблиц** (ориентир):

   | Было (Sheets) | Стало (SQL) |
   |---|---|
   | Orders | `orders` |
   | Workers | `workers` |
   | Rates | `rates` |
   | Payments | `payments` |
   | Equipment | `equipment` |
   | Rentals | `rentals` |
   | PushSubs | `push_subscriptions` (см. `supabase/schema.sql`) |

4. **Идентификаторы**: в БД `orders.order_id` — **TEXT** (например `"123"`); в старых сценариях мог быть числом — приведите тип в Code node при необходимости.

5. Импорт JSON в n8n по-прежнему: **Import from File** — затем пройдитесь по workflow и замените удалённые Google-ноды.

Схема таблиц для ручного SQL: см. репозиторий `supabase/` (в т.ч. `schema.sql` и основной скрипт схемы проекта в Supabase SQL Editor).
