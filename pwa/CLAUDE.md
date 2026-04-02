# Подряд PRO

## Стек
Next.js 14 App Router, Supabase, Tailwind CSS, ЮKassa

## Бизнес-модель
Скрытая наценка. Заказчик видит display_price. Исполнитель получает base_price (100%). Площадка бесплатна для исполнителей.

## Flow
1. Заказчик → лендинг → заявка (форма 152-ФЗ) → POST /api/leads → n8n → MAX
2. Мы создаём заказ в Supabase → ссылка на оплату /order/[id]/pay → ЮKassa эскроу
3. Деньги холдируются → работа → обе стороны подтверждают /order/[id]/confirm
4. capture + выплата (yookassa_payout / manual_transfer / cash)

## Правила
- base_price, markup_percent — НИКОГДА в публичных API
- display_price — единственная цена для заказчика
- Чекбокс 152-ФЗ обязателен в формах с ПД
- Шрифт: Manrope. Цвета: #2d35a8 primary, #f5a623 accent
- MAX — основной мессенджер, Telegram — резервный
