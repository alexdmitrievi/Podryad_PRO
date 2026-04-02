---
phase: quick-260402-njk
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - pwa/src/app/page.tsx
autonomous: true
requirements: [full-landing-rewrite]

must_haves:
  truths:
    - "Navbar shows only logo and [Оставить заявку] button — no other links"
    - "All 7 sections render in specified order: Hero, Рабочая сила, Аренда техники, Стройматериалы, Безопасная сделка, Для исполнителей, Form"
    - "Form submits to /api/leads and shows success message"
    - "All prices are hardcoded inline, not from DB"
    - "Page is mobile-first with primary #2d35a8 and accent #f5a623"
    - "Form includes all 5 fields: category, description, phone, city, messenger"
    - "No imports of LeadForm or other external components — everything inline"
  artifacts:
    - path: "pwa/src/app/page.tsx"
      provides: "Complete landing page with 7 sections + inline form"
      contains: "use client"
  key_links:
    - from: "pwa/src/app/page.tsx"
      to: "/api/leads"
      via: "fetch POST in handleSubmit"
      pattern: "fetch.*api/leads"
---

<objective>
Completely rewrite pwa/src/app/page.tsx with a new single-page landing.

Purpose: Replace the current landing with a simplified, spec-compliant page that has only 7 sections, a minimal navbar, and a fully inline lead form (no component imports).
Output: Rewritten pwa/src/app/page.tsx
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@pwa/src/app/api/leads/route.ts

<interfaces>
<!-- API contract for form submission -->
From pwa/src/app/api/leads/route.ts:
```typescript
// POST /api/leads
// Body: { phone: string, work_type: string, city?: string, comment?: string, source?: string }
// work_type must be one of: 'labor' | 'equipment' | 'materials' | 'complex'
// city defaults to 'omsk' if not provided
// Returns 201 { ok: true } on success
// Returns 422 { error: 'invalid_phone' } if phone < 10 digits
// Returns 422 { error: 'invalid_work_type' } if invalid work_type
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite page.tsx — complete landing with inline form</name>
  <files>pwa/src/app/page.tsx</files>
  <action>
Delete ALL existing content of pwa/src/app/page.tsx. Replace with a COMPLETE new file. The file MUST start with 'use client' since it contains form state (useState).

DO NOT import LeadForm, Link from next/link, or any other component. Only import React hooks (useState) from 'react'. Use plain anchor tags and native HTML — no Next.js Link component needed since all navigation is in-page scrolling.

NAVBAR (fixed top, bg-[#2d35a8]):
- Left: logo text "Подряд PRO" (with checkmark). Use a simple span with checkmark character, NOT an emoji icon.
- Right: one button [Оставить заявку] — scrolls to #lead-form via href="#lead-form"
- NO other links. No Заказы, Аренда, Маркетплейс, Тарифы, Самозанятым, Войти, Регистрация.

SECTION 1 — Hero (bg-[#2d35a8], text-white):
- Heading: "Рабочие . Техника . Стройматериалы — все для стройки в Омске и Новосибирске"
- Subheading: "Безопасная сделка — платите только за результат."
- Button [Оставить заявку (down arrow)] scrolls to #lead-form

SECTION 2 — Рабочая сила (bg-white):
- Grid of 4 cards: Грузчики от 350р/час, Разнорабочие от 300р/час, Уборка от 250р/час, Строители от 500р/час
- Note: "Бригады от 2 до 15 человек"

SECTION 3 — Аренда техники (bg-gray-50):
- Grid of 6 cards: Перфоратор 500р/сутки, Болгарка 400р/сутки, Бензогенератор 1500р/сутки, Газонокосилка 600р/сутки, Триммер 400р/сутки, Плиткорез 500р/сутки
- Note: "Тяжёлая техника по запросу"
- Note: "Скидка 15% при заказе рабочих + техники"

SECTION 4 — Стройматериалы (bg-white):
- List/grid: Бетон М100-М500, Щебень, Песок, Битум, Печное топливо
- Note: "Доставка по Омску и Новосибирску"

SECTION 5 — Безопасная сделка (bg-gray-50):
- 4 steps horizontal/vertical: 1) Заявка 2) Подбор 3) Оплата с заморозкой 4) Подтверждение
- Brief description for each step

SECTION 6 — Для исполнителей (bg-[#2d35a8], text-white):
- Heading: "Бесплатно. 100% ставки. Хотите подключиться?"
- Two buttons: [MAX] linking to https://max.ru/podryad_pro and [Telegram] linking to https://t.me/Podryad_PRO_bot
- Both open in new tab (target="_blank" rel="noopener noreferrer")

SECTION 7 — Form id="lead-form" (bg-white, scroll-mt-16):
- Heading: "Получить расчёт"
- INLINE form state using useState hooks (NOT importing LeadForm):
  - category: chip selector (Рабочие | Техника | Материалы | Комбо) — maps to work_type values ('labor' | 'equipment' | 'materials' | 'complex')
  - description: textarea for what they need
  - phone: tel input with +7 placeholder
  - city: select or chip (Омск | Новосибирск) — maps to 'omsk' | 'novosibirsk'
  - messenger: chip (MAX | Telegram | Позвонить) — include in comment field when submitting as "Связь: {messenger}"
- Submit button: "Получить расчёт"
- On submit: POST to /api/leads with { phone: stripped_digits, work_type: category, city, comment: description + messenger_preference, source: 'landing' }
- Validate phone >= 10 digits before submit
- Loading state on button
- After success: replace form with "Заявка отправлена! Свяжемся в течение 15 минут." message

FOOTER: minimal — logo, copyright, Telegram + MAX links.

STYLING:
- Colors: primary #2d35a8, accent #f5a623
- Mobile-first: single column on mobile, grid on md+
- All interactive elements: cursor-pointer, hover states with transition-all duration-200
- Rounded corners: rounded-xl or rounded-2xl
- Font: system default (no custom font import needed)
- All prices are HARDCODED literals in JSX — no constants object needed but can use one for clarity
- Sections should have py-16 md:py-24 padding, max-w-3xl or max-w-2xl mx-auto px-5

IMPORTANT CONSTRAINTS:
- File must start with 'use client'
- NO import of LeadForm component
- NO import of Link from next/link (use plain a tags)
- NO import from lucide-react or any icon library — use text/unicode characters for visual elements
- The only import should be { useState } from 'react'
- All form logic inline in the same file
  </action>
  <verify>
    <automated>cd /c/Users/HP/Desktop/Подряд_PRO/pwa && npx next lint --file src/app/page.tsx 2>&1 | head -20</automated>
  </verify>
  <done>
- page.tsx starts with 'use client'
- Only import is useState from 'react'
- Navbar has only logo + one button, no other nav links
- All 7 sections present in order
- All prices hardcoded (350, 300, 250, 500, 500, 400, 1500, 600, 400, 500)
- Form has 5 fields: category chips, description textarea, phone input, city selector, messenger chips
- Form POSTs to /api/leads with correct shape
- Success state shows confirmation message
- No LeadForm import, no Link import, no lucide import
  </done>
</task>

</tasks>

<verification>
- `cd pwa && npx next lint --file src/app/page.tsx` passes without errors
- `cd pwa && npx next build` completes (page compiles)
- Manual: open localhost:3000, verify 7 sections render, navbar has only logo + button, form submits
</verification>

<success_criteria>
- page.tsx is a single self-contained 'use client' file with no external component imports
- All 7 sections render with correct content and hardcoded prices
- Navbar is minimal (logo + one CTA button only)
- Inline form submits to /api/leads and shows success state
- Mobile-first responsive layout with #2d35a8 primary and #f5a623 accent
</success_criteria>

<output>
After completion, create `.planning/quick/260402-njk-rewrite-pwa-src-app-page-tsx-full-landin/260402-njk-SUMMARY.md`
</output>
