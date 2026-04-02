---
phase: quick
plan: 260402-jon
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/009_leads.sql
  - pwa/src/app/api/leads/route.ts
  - pwa/src/components/LeadForm.tsx
  - pwa/src/app/page.tsx
autonomous: true
requirements: [LEADS-MIGRATION, LEADS-API, LEAD-FORM-UI]

must_haves:
  truths:
    - "Landing page shows a working lead form instead of a stub"
    - "User can select category, fill description, phone, city, messenger and submit"
    - "Submission saves a row in the leads table via Supabase"
    - "Submission fires a webhook to n8n (fire-and-forget)"
    - "After success, user sees inline confirmation message"
    - "Phone validation rejects inputs with fewer than 10 digits"
  artifacts:
    - path: "supabase/migrations/009_leads.sql"
      provides: "leads table DDL"
      contains: "CREATE TABLE leads"
    - path: "pwa/src/app/api/leads/route.ts"
      provides: "POST /api/leads endpoint"
      exports: ["POST"]
    - path: "pwa/src/components/LeadForm.tsx"
      provides: "Interactive lead form component"
      contains: "use client"
    - path: "pwa/src/app/page.tsx"
      provides: "Landing page with LeadForm integrated"
      contains: "LeadForm"
  key_links:
    - from: "pwa/src/components/LeadForm.tsx"
      to: "/api/leads"
      via: "fetch POST on form submit"
      pattern: "fetch.*api/leads"
    - from: "pwa/src/app/api/leads/route.ts"
      to: "supabase leads table"
      via: "getServiceClient().from('leads').insert()"
      pattern: "from\\('leads'\\)"
    - from: "pwa/src/app/api/leads/route.ts"
      to: "n8n webhook"
      via: "fire-and-forget fetch POST"
      pattern: "n8n\\.podryad\\.pro/webhook/lead-notification"
    - from: "pwa/src/app/page.tsx"
      to: "pwa/src/components/LeadForm.tsx"
      via: "import and render in #lead-form section"
      pattern: "import.*LeadForm"
---

<objective>
Create a complete lead capture flow: database table, API endpoint, and interactive form component on the landing page.

Purpose: Replace the placeholder stub in the landing page with a working lead form that captures customer requests, saves them to Supabase, and notifies via n8n webhook.
Output: Migration SQL, API route, LeadForm component, updated landing page.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@pwa/src/lib/supabase.ts
@pwa/src/lib/db.ts
@pwa/src/app/page.tsx
@pwa/src/app/api/materials/route.ts
@supabase/migrations/008_orders_markup.sql

<interfaces>
<!-- Supabase client pattern used across the project -->

From pwa/src/lib/supabase.ts:
```typescript
export function getServiceClient(): SupabaseClient;
```

From pwa/src/lib/db.ts:
```typescript
import { getServiceClient } from './supabase';
const db = () => getServiceClient();
// Usage: db().from('table').insert(data).select().single()
```

From pwa/src/app/api/materials/route.ts (reference pattern for similar POST endpoint):
```typescript
// Rate limiting via in-memory Map
// Phone validation: body.phone.replace(/\D/g, '').length >= 10
// Webhook: fire-and-forget fetch to N8N_WEBHOOK_BASE
// Returns: { success: true }
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: DB migration + API route for leads</name>
  <files>supabase/migrations/009_leads.sql, pwa/src/app/api/leads/route.ts</files>
  <action>
**1. Create `supabase/migrations/009_leads.sql`:**

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  description TEXT,
  phone TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Омск',
  messenger TEXT DEFAULT 'max',
  status TEXT DEFAULT 'new',
  notes TEXT,
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
```

**2. Create `pwa/src/app/api/leads/route.ts`:**

POST handler following the same pattern as `/api/materials/route.ts`:

- In-memory rate limiter (Map-based, 5 requests per 60s per IP) — copy the exact pattern from `materials/route.ts`.
- Parse JSON body: `{ category, description, phone, city, messenger }`.
- Validate `category` is one of: `'workers'`, `'equipment'`, `'materials'`, `'combo'`. Return 400 if invalid.
- Validate `phone`: strip non-digits, reject if fewer than 10 digits. Return 400 with "Некорректный номер телефона".
- Validate `city` is one of: `'Омск'`, `'Новосибирск'`. Default to `'Омск'` if missing.
- Validate `messenger` is one of: `'max'`, `'telegram'`, `'phone'`. Default to `'max'` if missing.
- Insert into Supabase `leads` table using `getServiceClient()` directly (import from `@/lib/supabase`). Fields: `category`, `description` (truncated to 2000 chars), `phone` (truncated to 50 chars), `city`, `messenger`. Do NOT add a `createLead` function to `db.ts` — keep this self-contained in the route.
- Fire-and-forget webhook: `fetch('https://n8n.podryad.pro/webhook/lead-notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, description, phone, city, messenger, created_at: new Date().toISOString() }) }).catch(err => console.error('Lead webhook failed:', err))`. Do NOT await. The webhook error must NOT block the response.
- Return `{ success: true }` with 200 on success.
- Catch all errors, log, return 500 `{ error: 'Ошибка отправки заявки' }`.
  </action>
  <verify>
    <automated>cd C:/Users/HP/Desktop/Подряд_PRO && cat supabase/migrations/009_leads.sql | head -5 && npx tsc --noEmit --project pwa/tsconfig.json 2>&1 | head -20</automated>
  </verify>
  <done>009_leads.sql exists with CREATE TABLE leads. POST /api/leads compiles without TypeScript errors. Rate limiting, validation, Supabase insert, and fire-and-forget webhook are implemented.</done>
</task>

<task type="auto">
  <name>Task 2: LeadForm component + landing page integration</name>
  <files>pwa/src/components/LeadForm.tsx, pwa/src/app/page.tsx</files>
  <action>
**1. Create `pwa/src/components/LeadForm.tsx`:**

A `'use client'` component. Internal state: `category`, `description`, `phone`, `city`, `messenger`, `loading`, `success`, `error`.

**Category selector** (radio as pill/chip buttons, NOT browser radio inputs):
- Options: `Рабочие` (value: `workers`), `Техника` (value: `equipment`), `Стройматериалы` (value: `materials`), `Комбо (рабочие + техника)` (value: `combo`).
- Render as horizontal flex-wrap row of styled buttons. Selected state: `bg-[#2d35a8] text-white`. Unselected: `bg-white text-gray-700 border border-gray-200 hover:border-[#2d35a8]/40`. All have `rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-all duration-200`.

**Description textarea:**
- Label: "Опишите задачу"
- Placeholder: "Например: нужны 2 грузчика на 4 часа"
- Tailwind: `w-full rounded-xl border border-gray-200 focus:border-[#2d35a8] focus:ring-2 focus:ring-[#2d35a8]/20 outline-none px-4 py-3 text-sm resize-none` with `rows={3}`.

**Phone input:**
- `type="tel"`, placeholder `"+7 (___) ___-__-__"`
- Same rounded-xl styling as textarea.

**City selector** (pill/chip buttons, same style as category):
- Options: `Омск` (value: `Омск`), `Новосибирск` (value: `Новосибирск`).
- Default selected: `Омск`.

**Messenger selector** (pill/chip buttons):
- Options: `MAX` (value: `max`), `Telegram` (value: `telegram`), `Позвонить` (value: `phone`).
- Default selected: `max`.

**Submit button:**
- Text: "Получить расчёт →"
- Styling: `w-full bg-[#2d35a8] hover:bg-[#232b8a] active:scale-[0.98] text-white font-bold py-4 px-8 rounded-2xl text-base shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`.
- When `loading`: disabled, text changes to "Отправка..." with a simple CSS spinner (a `w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin` span inline before text).
- Disabled if `!category` or `!phone`.

**onSubmit handler:**
- Prevent default. Set `loading: true`, clear `error`.
- `fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, description, phone, city, messenger }) })`.
- If `!res.ok`: parse JSON, set `error` from response `error` field or generic "Произошла ошибка. Попробуйте ещё раз."
- If ok: set `success: true`.
- Finally: set `loading: false`.

**Success state** (replaces the form when `success === true`):
- Centered block with check icon (an SVG circle with checkmark, NOT emoji, colored `#22c55e`).
- Text: "Заявка отправлена!" (font-bold, text-lg).
- Subtext: "Свяжемся в течение 15 минут (9:00-20:00)" (text-sm, text-gray-500).
- Phone: "+7-913-669-16-65" (text-sm, text-gray-500, as an `<a href="tel:+79136691665">`).
- A "Отправить ещё" link/button below to reset the form (text-[#2d35a8], underline, cursor-pointer). Resets all state.

**Error state:**
- Below the submit button: a `<p>` with `text-red-600 text-sm mt-3 text-center` showing the error string.

**Layout:**
- The component wraps fields in a `<form>` tag. Field groups separated by `space-y-5`. Each field group has a label (`text-sm font-semibold text-gray-700 mb-2 block`).
- Mobile-first: full width. No max-width constraint (parent controls that).

**2. Update `pwa/src/app/page.tsx`:**

- Add `import LeadForm from '@/components/LeadForm';` at top.
- Replace the entire `{/* -- LEAD FORM STUB -- */}` section (lines 310-360) with:

```tsx
{/* -- LEAD FORM -- */}
<section id="lead-form" className="bg-white py-16 md:py-24 scroll-mt-14">
  <div className="max-w-lg mx-auto px-5">
    <div className="text-center mb-8">
      <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
        Оставить заявку
      </h2>
      <p className="text-gray-500 mt-2 text-sm">
        Омск и Новосибирск · Ответим в течение 15 минут
      </p>
    </div>
    <LeadForm />
  </div>
</section>
```

This preserves the section heading and container, delegating only the form body to the client component. The page itself stays as a server component (no 'use client' needed on page.tsx).
  </action>
  <verify>
    <automated>cd C:/Users/HP/Desktop/Подряд_PRO && npx tsc --noEmit --project pwa/tsconfig.json 2>&1 | head -20 && grep -c "LeadForm" pwa/src/app/page.tsx && grep -c "use client" pwa/src/components/LeadForm.tsx</automated>
  </verify>
  <done>LeadForm.tsx is a 'use client' component with category/description/phone/city/messenger fields, pill-style selectors, loading spinner, inline success state with SVG checkmark (not emoji), error display. page.tsx imports LeadForm and renders it in the #lead-form section replacing the stub. TypeScript compiles cleanly.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit --project pwa/tsconfig.json` — zero TypeScript errors
2. `009_leads.sql` contains valid CREATE TABLE with all specified columns
3. `pwa/src/app/api/leads/route.ts` exports POST function
4. `pwa/src/components/LeadForm.tsx` contains 'use client' directive
5. `pwa/src/app/page.tsx` imports and renders LeadForm, no stub remains
6. `npm run build` in pwa/ succeeds (full Next.js build check)
</verification>

<success_criteria>
- leads table migration ready for Supabase SQL Editor execution
- POST /api/leads validates input, saves to DB, fires webhook (non-blocking)
- LeadForm component renders styled pill selectors, validates phone, shows loading/success/error states
- Landing page #lead-form section replaced with working interactive form
- No emoji icons in the component — SVG only for the success checkmark
- All interactive elements have cursor-pointer and hover transitions
</success_criteria>

<output>
After completion, create `.planning/quick/260402-jon-leads-migration-post-api-leads-leadform-/260402-jon-SUMMARY.md`
</output>
