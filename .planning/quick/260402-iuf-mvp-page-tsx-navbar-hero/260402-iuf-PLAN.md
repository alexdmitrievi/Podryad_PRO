---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - pwa/src/components/StickyHeader.tsx
  - pwa/src/app/layout.tsx
  - pwa/src/app/page.tsx
autonomous: true
requirements: [MVP-LANDING]

must_haves:
  truths:
    - "Home page shows simple navbar with logo and CTA button only"
    - "StickyHeader from layout.tsx is hidden on home page"
    - "Hero section displays tagline about workers, equipment, materials in Omsk/Novosibirsk"
    - "Labor section shows 4 worker types with hardcoded prices"
    - "Equipment rental section shows 6 tool items with prices + heavy machinery note"
    - "Materials section shows concrete, gravel, sand, bitumen, fuel"
    - "Safe deal section shows 4-step escrow flow"
    - "Executor section shows zero-commission message with MAX and Telegram links"
    - "Lead form stub exists with id=lead-form"
    - "All CTA buttons scroll to #lead-form"
    - "Page is fully static, no DB queries, no client components"
  artifacts:
    - path: "pwa/src/components/StickyHeader.tsx"
      provides: "Hide header on home page"
      contains: "pathname === '/'"
    - path: "pwa/src/app/layout.tsx"
      provides: "Space Grotesk font import"
      contains: "Space_Grotesk"
    - path: "pwa/src/app/page.tsx"
      provides: "Complete MVP landing page with 7 sections + inline navbar + footer"
      min_lines: 200
  key_links:
    - from: "pwa/src/app/page.tsx"
      to: "#lead-form"
      via: "anchor href scroll"
      pattern: "href.*#lead-form"
    - from: "pwa/src/components/StickyHeader.tsx"
      to: "home page hiding"
      via: "pathname check"
      pattern: "pathname.*=.*'/'"
---

<objective>
Replace the complex pwa/src/app/page.tsx with a simple, static MVP landing page. Remove all dynamic components (CostCalculator, AnimatedCounter, Testimonials, ScrollReveal, etc.). Add an inline minimal navbar (logo + CTA). Hide the existing StickyHeader on the home page. Add Space Grotesk font for character.

Purpose: Ship a clean, fast landing page focused on lead generation for Omsk/Novosibirsk construction services.
Output: Static landing page with 7 content sections, inline navbar, lead form stub, footer.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@pwa/src/app/page.tsx
@pwa/src/app/layout.tsx
@pwa/src/components/StickyHeader.tsx
@pwa/src/app/globals.css
@pwa/tailwind.config.js
</context>

<interfaces>
<!-- From layout.tsx — font setup pattern -->
```typescript
import { Inter, Manrope } from 'next/font/google';
// fonts are applied as CSS variables: --font-inter, --font-manrope
// html className: `${inter.variable} ${manrope.variable}`
```

<!-- From StickyHeader.tsx — pathname-based hiding pattern -->
```typescript
const pathname = usePathname();
if (pathname?.startsWith('/auth')) return null; // existing hide pattern
```

<!-- From globals.css — reusable classes -->
```css
.hero-pattern { /* premium mesh gradient background */ }
.noise-overlay::before { /* subtle noise texture */ }
.text-gradient { /* white gradient text for dark backgrounds */ }
.badge-brand-hero { /* glass pill badge on dark hero */ }
.btn-animated-gradient { /* animated gradient CTA button */ }
.card-premium { /* elevated card with hover effect */ }
.divider-gradient { /* subtle gradient line */ }
```

<!-- Env vars for messenger links -->
```typescript
const tgBot = process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot';
const maxChannel = process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryad_pro';
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Hide StickyHeader on home + add Space Grotesk font</name>
  <files>pwa/src/components/StickyHeader.tsx, pwa/src/app/layout.tsx</files>
  <action>
1. In StickyHeader.tsx, add home page hiding alongside the existing auth hide:
   - Change `if (pathname?.startsWith('/auth')) return null;` to also cover `pathname === '/'`
   - Use: `if (pathname === '/' || pathname?.startsWith('/auth')) return null;`

2. In layout.tsx, add Space Grotesk font import from next/font/google:
   ```typescript
   import { Inter, Manrope, Space_Grotesk } from 'next/font/google';

   const spaceGrotesk = Space_Grotesk({
     subsets: ['latin'],
     variable: '--font-space',
     display: 'swap',
   });
   ```
   - Add `${spaceGrotesk.variable}` to the html className alongside existing font variables
   - This makes `font-[family-name:var(--font-space)]` available in Tailwind for the landing page

Do NOT change anything else in layout.tsx or StickyHeader.tsx.
  </action>
  <verify>
    <automated>cd /c/Users/HP/Desktop/Подряд_PRO/pwa && npx next lint --file src/components/StickyHeader.tsx --file src/app/layout.tsx 2>&1 | head -20</automated>
  </verify>
  <done>StickyHeader returns null on pathname === '/'. Space Grotesk font variable available as --font-space in CSS.</done>
</task>

<task type="auto">
  <name>Task 2: Rewrite page.tsx as static MVP landing</name>
  <files>pwa/src/app/page.tsx</files>
  <action>
Completely replace pwa/src/app/page.tsx with a static server component (NO 'use client', NO imports from @/components except lucide-react icons). Zero DB queries. All prices hardcoded.

**Color scheme in Tailwind classes:**
- Primary: use `bg-[#2d35a8]` / `text-[#2d35a8]` (darker blue than brand-500)
- Accent: use `bg-[#f5a623]` / `text-[#f5a623]` (warm gold)
- Keep existing dark mode support via dark: prefix where sensible

**Font:** Use `font-[family-name:var(--font-space)]` on headings for Space Grotesk character. Body text stays Inter (default).

**Structure (top to bottom):**

**Inline Navbar** (fixed top, z-50):
- Left: Star icon (lucide Star) + "Подряд PRO" text in bold
- Right: `<a href="#lead-form">` button "Оставить заявку" styled with accent color `bg-[#f5a623]`
- Background: transparent initially, becomes white/blur on scroll? NO — this is a server component, no scroll JS. Use simple semi-transparent dark bg: `bg-[#2d35a8]/90 backdrop-blur-sm`. Fixed position.
- Height: h-14, max-w-5xl mx-auto px-5

**Section 1: Hero**
- Full-width dark gradient background (reuse existing hero-pattern + noise-overlay CSS classes)
- pt-24 (account for fixed navbar)
- Heading: "Рабочие · Техника · Стройматериалы" (use `·` as separator, Space Grotesk font)
- Subheading: "Всё для стройки в Омске и Новосибирске. Безопасная сделка — платите только за результат."
- CTA button: "Оставить заявку" with ArrowRight icon, `<a href="#lead-form">`, accent bg

**Section 2: Рабочая сила** (light bg)
- Heading: "Рабочая сила"
- 4-column grid (2 cols mobile):
  | Грузчики     | от 350 р/час |
  | Разнорабочие | от 300 р/час |
  | Уборка       | от 250 р/час |
  | Строители    | от 500 р/час |
- Each as a card with icon (lucide: Package, Hammer, Sparkles, HardHat or similar), title, price
- Note below cards: "Бригады от 2 до 15 человек. Безопасная сделка — платите только за результат."

**Section 3: Аренда техники** (gray-50 bg)
- Heading: "Аренда техники"
- 3-column grid (2 cols mobile), 6 items:
  | Мотокосилка    | 500 р/сутки  |
  | Болгарка       | 400 р/сутки  |
  | Бензогенератор | 1 500 р/сутки |
  | Газонокосилка  | 600 р/сутки  |
  | Триммер        | 400 р/сутки  |
  | Плиткорез      | 500 р/сутки  |
- Below grid: "Тяжёлая техника (самосвал, экскаватор, кран) — по запросу"
- Accent banner: "Скидка 15% при заказе рабочих + техники" with Gift icon

**Section 4: Стройматериалы** (white bg)
- Heading: "Стройматериалы"
- Simple list or grid of items: Бетон М100–М500, Щебень 5–70мм, Песок, Битум ДМ 100/130, Чёрное топливо
- Note: "Доставка по Омску и Новосибирску"

**Section 5: Безопасная сделка** (primary bg `bg-[#2d35a8]`, white text)
- Heading: "Безопасная сделка"
- 4 steps in a numbered row (1-2-3-4 on desktop, vertical on mobile):
  1. Оставляете заявку
  2. Мы подбираем исполнителя
  3. Оплачиваете — деньги замораживаются
  4. Подтверждаете результат — исполнитель получает оплату
- Use Shield icon for visual weight

**Section 6: Для исполнителей** (light bg)
- Heading: "Для исполнителей"
- Text: "Зарабатывайте бесплатно. Никаких комиссий. 100% ставки."
- Subtext: "Хотите подключиться? Напишите нам:"
- Two buttons side by side:
  - MAX button (blue `bg-[#2787F5]`) linking to `maxChannel`
  - Telegram button (blue `bg-[#26A5E4]`) linking to `telegramUrl`
- Use env vars: `process.env.NEXT_PUBLIC_MAX_CHANNEL_LINK || 'https://max.ru/podryad_pro'` and `process.env.NEXT_PUBLIC_BOT_NAME || 'Podryad_PRO_bot'`

**Section 7: Форма заявки** (gray-50 bg)
- `<section id="lead-form">`
- Heading: "Оставить заявку"
- Stub div with text: "Форма заявки — скоро" styled as a placeholder card
- scroll-mt-20 for smooth scroll offset under fixed navbar

**Footer** (dark bg `bg-[#0a0c14]`):
- Simplified footer: logo + copyright + Telegram/MAX links
- No multi-column nav (removed per MVP simplification)
- Copyright: 2026 Подряд PRO

**Important constraints:**
- NO 'use client' directive — this is a pure server component
- NO imports from @/components (no CostCalculator, AnimatedCounter, Testimonials, ScrollReveal, MaterialsSection, SafeDealSection, ComboOfferBanner, CrewsTeaser, StatsSection, SuppliersSection)
- Only import from 'lucide-react' for icons
- Mobile-first: all grids use responsive breakpoints (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 etc.)
- Use existing CSS utility classes from globals.css where applicable (hero-pattern, noise-overlay, text-gradient, card-premium, badge-brand-hero)
- Minimal animations — only CSS transitions on hover states (transition-colors duration-200), NO JS animations
- cursor-pointer on all clickable elements
- Hover states with transitions on buttons and cards
  </action>
  <verify>
    <automated>cd /c/Users/HP/Desktop/Подряд_PRO/pwa && npx next lint --file src/app/page.tsx 2>&1 | head -20 && npx next build 2>&1 | tail -30</automated>
  </verify>
  <done>
- page.tsx is a static server component with no client-side imports
- All 7 sections render with hardcoded prices
- Inline navbar shows logo + CTA only
- All "Оставить заявку" buttons link to #lead-form
- Section for executors links to MAX and Telegram via env vars
- id="lead-form" stub exists
- Build succeeds with no errors
  </done>
</task>

</tasks>

<verification>
1. `cd pwa && npx next build` completes without errors
2. Homepage at localhost:3000 shows simple navbar (logo + CTA), not the full StickyHeader nav
3. All 7 sections visible in correct order
4. Clicking "Оставить заявку" scrolls to #lead-form section
5. No client components imported (grep for 'use client' in page.tsx returns nothing)
6. No database queries in page.tsx
</verification>

<success_criteria>
- Static MVP landing page loads at / with 7 content sections
- StickyHeader is hidden on home page
- Space Grotesk font applied to headings
- All prices hardcoded, no dynamic data
- Build passes, lint passes
- Mobile-responsive layout
</success_criteria>

<output>
After completion, create `.planning/quick/260402-iuf-mvp-page-tsx-navbar-hero/260402-iuf-SUMMARY.md`
</output>
