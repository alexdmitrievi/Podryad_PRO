# Подряд PRO — Project Context

## Vision
Маркетплейс строительных услуг, материалов и аренды техники для Омска и Новосибирска.

## Stack
- Next.js 15 (App Router), TypeScript
- Supabase (PostgreSQL + RLS)
- Tailwind CSS
- YooKassa (payments + payouts)
- n8n (Telegram + SMS notifications)

## Brand
- Primary: #2d35a8 | Dark: #1a1f5c | Accent/Gold: #f5a623
- Fonts: Manrope / Golos Text (кириллица)

## Business Model
- Заказчик платит: subtotal + сервисный сбор 10%
- Исполнитель получает: 100% subtotal (площадка бесплатна)
- Скидка 15% при комбо-заказе (≥2 listing_type)

## Legal
- ИП Жбанков А.Д. (ИНН 550516401202), УСН «Доходы» 6%

## Non-Negotiables
- НИКОГДА не показывать маржу/внутренние ставки в публичном UI
- Исполнители всегда получают 100% от subtotal
- RLS на все таблицы
- Webhook YooKassa верифицировать по подписи
