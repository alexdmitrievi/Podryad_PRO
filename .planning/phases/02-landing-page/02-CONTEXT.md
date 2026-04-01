# Phase 2: Landing Page — Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Конверсионный лендинг по спеку — 10 секций: Hero, SafeDeal, Calculator, Combo, Crews, Catalog-preview, How-it-works, Stats, For-executors, Footer.

**Подход:** Обновить существующий `pwa/src/app/page.tsx` — он уже покрывает ~7/10 секций. Добавить недостающие и усилить слабые.

**Существующие секции (сохранить/улучшить):**
- Hero ✅ — оставить, можно усилить subtitle/badge
- Trust bar (Stats) ✅ — AnimatedCounter, 3 метрики
- Why us / UTP ✅ — 3 карточки
- How it works ✅ — 3 шага
- Calculator ✅ — CostCalculator компонент
- Catalog-preview ✅ — Marketplace + Equipment превью
- Footer ✅ — полный, 4 колонки

**Добавить/переработать:**
- SafeDeal — выделенная секция после Hero (сейчас только карточка в UTP)
- Combo — выделенная секция про скидку 15%
- Crews — секция-тизер бригад (Phase 4 не реализована, тизер с CTA регистрации)
- For-executors — выделенная секция (сейчас только role-selection карточки)

**НЕ входит в эту фазу:** Backend, каталог, кабинеты, реальные страницы бригад.

</domain>

<decisions>
## Implementation Decisions

### D-01: SafeDeal Section
- **Формат:** 4 шага flow (горизонтальный прогресс-бар или stepper)
- **Шаги:** Оплата замораживает средства → Исполнитель выполняет работу → Оба подтверждают → Автоматическая выплата
- **Позиция:** Сразу после Hero — второй блок на странице
- **Аудитория:** Заказчик — акцент на защите от нечестных исполнителей
- **Тон:** "Деньги в безопасности, пока работа не принята" — не "эскроу" (технический термин), а человеческое объяснение

### D-02: Подход к странице
- Обновить существующий `page.tsx` на месте — не создавать новый маршрут
- Вставить новые секции между существующими согласно порядку спека
- Текущие секции, не указанные в спеке (Testimonials, MaterialsSection), могут быть убраны или оставлены — на усмотрение Клода

### Claude's Discretion
- Визуальное оформление SafeDeal flow (горизонтальный stepper vs иконки vs numbered cards)
- Combo-секция: как показать скидку 15% (calculator preview, таблица сравнения, или highlight banner)
- Crews-секция: тизер-карточки с "Скоро" badge + CTA "Подать заявку бригадиром"
- For-executors: какие метрики выигрыша показать (средний доход, кол-во заказов в месяц, условия)
- Удалять ли Testimonials и MaterialsSection — оставить если органично, убрать если нарушают flow спека
- Точный текст и copy для всех секций

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Landing Page
- `pwa/src/app/page.tsx` — текущий лендинг (полная реализация, ~615 строк)

### Existing Reusable Components
- `pwa/src/components/CostCalculator.tsx` — калькулятор (переиспользовать)
- `pwa/src/components/AnimatedCounter.tsx` — анимированные счётчики (переиспользовать)
- `pwa/src/components/ScrollReveal.tsx` — scroll-анимации (переиспользовать)
- `pwa/src/components/MaterialsSection.tsx` — секция материалов (может быть убрана/оставлена)

### Design System
- Brand: primary `#2d35a8`, dark `#1a1f5c`, accent/gold `#f5a623`
- Fonts: Manrope (heading), Golos Text (body) — кириллица
- Icons: только SVG (Lucide React), NO emoji в UI
- `pwa/tailwind.config.js` — кастомные токены (brand, accent, surface, dark-*)
- `pwa/src/app/globals.css` — CSS-переменные, утилиты (card-premium, btn-animated-gradient, hero-pattern)

### Business Rules (NON-NEGOTIABLE)
- `pwa/src/lib/rates.ts` — тарифы (НЕ показывать в UI: маржу, сервисный сбор, внутренние ставки)
- Исполнители получают 100% subtotal — это можно показывать
- Скидка 15% при комбо-заказе (≥2 listing_type) — можно показывать

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CostCalculator` — полнофункциональный, готов к переиспользованию
- `AnimatedCounter` — поддерживает end, suffix, decimals, duration — подойдёт для Stats секции
- `ScrollReveal` — CSS-анимации появления, delay prop
- Lucide React — уже установлен, импортировать нужные иконки
- `card-premium` CSS-класс — стилизованные карточки с shadow (из globals.css)
- `btn-animated-gradient` — градиентная кнопка Hero
- `hero-pattern` / `noise-overlay` — паттерн для тёмного фона Hero

### Established Patterns
- Тёмные секции: `bg-gradient-to-br from-[#0a0c14] via-brand-900 to-brand-700` + `hero-pattern`
- Светлые секции: чередование `bg-white` и `bg-gray-50`
- Карточки: `rounded-2xl p-6 border hover:border-brand-500 transition-all`
- Иконки в кружках: `w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center`
- Grid-сетки: `grid-cols-1 md:grid-cols-3 gap-6`
- Контейнер: `max-w-4xl mx-auto px-6`

### Integration Points
- `page.tsx` — единая точка редактирования (Server Component, может включать client-компоненты)
- Новые компоненты (если нужны) → `pwa/src/components/`
- Изображения → `pwa/public/` (или placeholder-заглушки)

</code_context>

<specifics>
## Specific Ideas

- SafeDeal шаги: иконки щита/замка/галочки/выплаты — из Lucide (Shield, Lock, CheckCircle, Banknote)
- Акцент на "Деньги заморожены до подтверждения" — главный messaging против оплаты наличными
- Для Crews-тизера: "Ищем бригадиров" или "Зарегистрируйте бригаду первыми"
- For-executors: цифры типа "Исполнители зарабатывают в среднем X₽/день" — пока можно поставить реалистичную оценку

</specifics>

<deferred>
## Deferred Ideas

- Отдельная страница `/safe-deal` с подробным описанием эскроу — будущая фаза
- Testimonials с реальными отзывами из БД — Phase 5 (Dashboard)
- Crews с реальными профилями — Phase 4
- A/B тестирование Hero CTA — после запуска

</deferred>

---

*Phase: 02-landing-page*
*Context gathered: 2026-04-01*
