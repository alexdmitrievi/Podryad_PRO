---
phase: quick-260402-rhw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/010_leads_status.sql
  - pwa/src/app/api/admin/listings/route.ts
  - pwa/src/app/api/admin/listings/[id]/route.ts
  - pwa/src/app/api/admin/leads/route.ts
  - pwa/src/app/api/admin/leads/[id]/route.ts
  - pwa/src/app/admin/page.tsx
autonomous: true
requirements: [ADMIN-LISTINGS, ADMIN-LEADS]

must_haves:
  truths:
    - "Admin can open /admin, enter PIN, and see Listings and Leads tabs alongside existing tabs"
    - "Admin can add a new listing (name, type, category, price, unit, photos, active toggle) and see it saved with display_price computed via applyMarkup"
    - "Admin can edit an existing listing and delete it"
    - "Admin can toggle listing active/hidden without opening the full edit form"
    - "Admin can see all leads with date, work_type, phone, city, comment, status columns"
    - "Admin can change a lead status (new → in_progress → converted → rejected)"
    - "Photos upload to Supabase Storage bucket listings-images (up to 3 per listing)"
  artifacts:
    - path: "supabase/migrations/010_leads_status.sql"
      provides: "status column on leads table"
      contains: "ALTER TABLE leads ADD COLUMN IF NOT EXISTS status"
    - path: "pwa/src/app/api/admin/listings/route.ts"
      provides: "GET all listings (base_price visible), POST create"
      exports: ["GET", "POST"]
    - path: "pwa/src/app/api/admin/listings/[id]/route.ts"
      provides: "PUT update, DELETE delete"
      exports: ["PUT", "DELETE"]
    - path: "pwa/src/app/api/admin/leads/route.ts"
      provides: "GET all leads"
      exports: ["GET"]
    - path: "pwa/src/app/api/admin/leads/[id]/route.ts"
      provides: "PUT update lead status"
      exports: ["PUT"]
    - path: "pwa/src/app/admin/page.tsx"
      provides: "Listings tab + Leads tab added to existing admin page"
  key_links:
    - from: "pwa/src/app/admin/page.tsx ListingsTab"
      to: "/api/admin/listings"
      via: "fetch with x-admin-pin header"
      pattern: "fetch.*api/admin/listings"
    - from: "pwa/src/app/api/admin/listings/route.ts POST"
      to: "applyMarkup from lib/pricing.ts"
      via: "import and call to compute display_price"
      pattern: "applyMarkup"
    - from: "pwa/src/app/admin/page.tsx LeadsTab"
      to: "/api/admin/leads/[id]"
      via: "PUT with {status} body and x-admin-pin header"
      pattern: "fetch.*api/admin/leads"
---

<objective>
Add Listings CRUD management and Leads viewer with status management to the existing /admin panel.

Purpose: The admin needs to populate the catalog with rental equipment and construction materials listings, set pricing (base_price + markup auto-computes display_price), upload photos, and track leads from the landing form.

Output:
- DB migration adding status column to leads
- 4 new API routes (listings CRUD + leads GET/status-update)
- Two new tabs (Позиции, Заявки) wired into existing admin page.tsx PIN-gate system
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@pwa/src/app/admin/page.tsx
@pwa/src/lib/pricing.ts
@pwa/src/lib/supabase.ts
@pwa/src/app/api/admin/orders/route.ts
@supabase/migrations/009_leads.sql
@supabase/migrations/007_catalog.sql
</context>

<interfaces>
<!-- Key types and contracts the executor needs -->

From pwa/src/lib/pricing.ts:
```typescript
export async function getMarkupRate(
  supabase: SupabaseClient,
  listingType: string,
  category?: string,
  subcategory?: string
): Promise<number>

export function applyMarkup(
  basePrice: number,
  markupPercent: number
): { basePrice: number; displayPrice: number; markupPercent: number }
```

From pwa/src/lib/supabase.ts:
```typescript
export function getServiceClient(): SupabaseClient  // bypasses RLS
```

Admin PIN auth pattern (from existing routes, e.g. pwa/src/app/api/admin/orders/route.ts):
```typescript
function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}
// GET: pin from req.headers.get('x-admin-pin')
// POST/PUT/DELETE: pin from req body JSON { pin, ...rest }
```

listings table columns (from 007_catalog.sql + existing code):
- id, title, description, listing_type (labor|material|equipment_rental)
- category_slug, subcategory, base_price, display_price, markup_percent
- price_unit (text), images (text[]), is_active (boolean), city
- supplier_id, is_priority, rating, orders_count

leads table columns (from 009_leads.sql):
- id, phone, work_type, city, comment, source, created_at
- status (to be added by migration 010)
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: DB migration for leads status + API routes (listings CRUD + leads)</name>
  <files>
    supabase/migrations/010_leads_status.sql,
    pwa/src/app/api/admin/listings/route.ts,
    pwa/src/app/api/admin/listings/[id]/route.ts,
    pwa/src/app/api/admin/leads/route.ts,
    pwa/src/app/api/admin/leads/[id]/route.ts
  </files>
  <action>
**1. supabase/migrations/010_leads_status.sql**

Add status column to leads:
```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
  CHECK (status IN ('new', 'in_progress', 'converted', 'rejected'));
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
```

**2. pwa/src/app/api/admin/listings/route.ts**

GET: verifyPin from x-admin-pin header. Query listings table with all fields including base_price, display_price, markup_percent. Order by created_at DESC. Return { listings }.

POST: verifyPin from body.pin. Accept body fields:
- title (required, string)
- description (string, nullable)
- listing_type (required: 'equipment_rental' | 'material')
- category_slug (required, string)
- subcategory (string, nullable)
- base_price (required, number)
- price_unit (required: '₽/день' | '₽/час' | '₽/м³' | '₽/тонну' | '₽/смену')
- images (string[], max 3)
- is_active (boolean, default true)
- city (string, default 'omsk')

Compute display_price: call getMarkupRate(db, listing_type, category_slug, subcategory), then applyMarkup(base_price, markupPercent). Store base_price, display_price, markup_percent in the row.

Insert into listings. Return { listing } 201.

**3. pwa/src/app/api/admin/listings/[id]/route.ts**

PUT: verifyPin from body.pin. Accept same fields as POST (all optional). If base_price or category changes, recompute display_price + markup_percent via getMarkupRate + applyMarkup. Update listings row by id. Return { listing }.

DELETE: verifyPin from body.pin (read body with req.json()). Delete listings row by id. Return { ok: true } 200.

**4. pwa/src/app/api/admin/leads/route.ts**

GET: verifyPin from x-admin-pin header. Query leads table: id, phone, work_type, city, comment, source, status, created_at. Order by created_at DESC. Limit 200. Return { leads }.

**5. pwa/src/app/api/admin/leads/[id]/route.ts**

PUT: verifyPin from body.pin. Accept { pin, status }. Validate status is one of 'new' | 'in_progress' | 'converted' | 'rejected'. Update leads row status. Return { ok: true }.

Auth pattern: copy verifyPin helper from existing admin routes (timingSafeEqual). No new auth mechanisms.
  </action>
  <verify>
    <automated>cd pwa && npx tsc --noEmit 2>&1 | grep -E "admin/listings|admin/leads" | head -20; echo "TypeScript check done"</automated>
  </verify>
  <done>
    - 5 files created, no TypeScript errors in admin routes
    - All routes verify PIN before any DB operation
    - POST /api/admin/listings returns 201 with display_price != base_price (markup applied)
    - PUT /api/admin/leads/[id] accepts valid status values only
  </done>
</task>

<task type="auto">
  <name>Task 2: Add Listings tab + Leads tab to existing admin page.tsx</name>
  <files>pwa/src/app/admin/page.tsx</files>
  <action>
The existing admin page uses PIN-gate + tabbed UI. It already has: users, orders, markups, disputes, stats tabs. Add two new tabs: 'listings' (Позиции) and 'leads' (Заявки).

**Update TabId type and TABS array:**
Add `{ id: 'listings', label: 'Позиции', icon: Package }` and `{ id: 'leads', label: 'Заявки', icon: Inbox }` to TABS. Import Package, Inbox from lucide-react.

**Add interfaces at top of file:**
```typescript
interface AdminListing {
  id: string;
  title: string;
  listing_type: string;
  category_slug: string;
  subcategory: string | null;
  base_price: number;
  display_price: number;
  markup_percent: number;
  price_unit: string;
  images: string[];
  is_active: boolean;
  city: string;
  created_at: string;
}

interface AdminLead {
  id: number;
  phone: string;
  work_type: string;
  city: string;
  comment: string | null;
  source: string;
  status: string;
  created_at: string;
}
```

**ListingsTab component** (`{ pin }: { pin: string }`):

State: listings (AdminListing[]), loading, error, showForm (boolean for add/edit modal), editItem (AdminListing | null), saving, deleting (string | null).

Form state (controlled): title, listing_type ('equipment_rental' | 'material'), category_slug, subcategory, base_price (string), price_unit, images (string[], max 3), is_active, uploading (boolean for photo upload).

Category options by listing_type:
- equipment_rental: garden (Садовая), small_construction (Малая стройка), special_equipment (Спецтехника), heavy_machinery (Тяжёлая техника)
- material: concrete (Бетон), gravel (Щебень), sand (Песок), asphalt (Асфальт), solid_fuel (Твёрдое топливо), other (Другое)

Price unit options: ₽/день, ₽/час, ₽/м³, ₽/тонну, ₽/смену

On listing_type change: reset category_slug to first option of new type.

Load listings on mount via GET /api/admin/listings with x-admin-pin header.

Toolbar: [+ Добавить позицию] button, filter select by listing_type (Все | Аренда техники | Стройматериалы).

Table columns: Название, Тип, Категория, Цена (base), Цена (display), Ед., Статус, Действия.
- Статус: badge — active=green "Активно", hidden=gray "Скрыто"
- Действия: [Редакт.] button → opens form in edit mode; [Скрыть/Показать] button → PUT toggle is_active; [Удалить] button → DELETE with confirm(). 

Photo upload (inside form): file input accept="image/*" multiple (max 3). On file select, upload each file to Supabase Storage bucket 'listings-images' via signed URL approach: POST to /api/admin/listings-upload (do NOT create this route — instead use Supabase client directly from the browser with anon key). Use `supabase.storage.from('listings-images').upload(...)` from `@/lib/supabase` (client-side anon supabase). Public URL via `supabase.storage.from('listings-images').getPublicUrl(path).data.publicUrl`. Show thumbnail previews. Allow removing uploaded images.

Form save: if editItem → PUT /api/admin/listings/[id] with body { pin, ...formFields }. Else → POST /api/admin/listings with body { pin, ...formFields }. On success: reload listings, close form.

Form UI: modal overlay (fixed inset-0 bg-black/50 z-50). Inner panel: max-w-lg, white card. Fields in a simple vertical stack:
- Radio group: Аренда техники / Стройматериалы (listing_type)
- Select: Категория (category_slug, options depending on listing_type)
- Input: Название (title)
- Textarea: Описание (description, optional)
- Number input: Базовая цена (base_price)
- Select: Единица (price_unit)
- Photo upload area (images, max 3)
- Toggle: Активно (is_active)
- [Сохранить] / [Отмена] buttons

**LeadsTab component** (`{ pin }: { pin: string }`):

State: leads (AdminLead[]), loading, error, selectedLead (AdminLead | null), updating (number | null).

Load leads on mount via GET /api/admin/leads with x-admin-pin header.

Status label map: new="Новый", in_progress="В работе", converted="Конвертирован", rejected="Отклонён".
Status badge colors: new=blue, in_progress=amber, converted=green, rejected=gray.

Table columns: Дата, Тип работы, Телефон, Город, Комментарий (truncated to 40 chars), Статус, Действие.
- Действие: select dropdown with 4 status options. On change → PUT /api/admin/leads/[id] with { pin, status }. Show spinner next to row while updating.

work_type display labels: labor="Рабочая сила", equipment="Аренда техники", materials="Стройматериалы", complex="Комплекс".

Click on row (except action column): show selectedLead panel below table (or modal) with full details: phone, work_type, city, comment, source, created_at, status.

**Wire into AdminPage:**
In the tab render block add:
```tsx
{activeTab === 'listings' && <ListingsTab pin={pin} />}
{activeTab === 'leads' && <LeadsTab pin={pin} />}
```

Keep all existing tabs untouched. Use same Tailwind class patterns as existing tabs (bg-white dark:bg-dark-card rounded-2xl shadow-card, etc.).
  </action>
  <verify>
    <automated>cd pwa && npx tsc --noEmit 2>&1 | grep "admin/page" | head -20; echo "TypeScript check done"</automated>
  </verify>
  <done>
    - pwa/src/app/admin/page.tsx compiles without TypeScript errors
    - Two new tabs visible in the tab bar: Позиции and Заявки
    - Existing 5 tabs (users, orders, markups, disputes, stats) remain functional
    - ListingsTab: table loads, form opens/closes, add/edit/delete/toggle work
    - LeadsTab: table loads with status badges, status dropdown updates on change
  </done>
</task>

</tasks>

<verification>
After execution:
1. `cd pwa && npx tsc --noEmit` — zero errors in admin files
2. Navigate to /admin in browser, enter PIN → see 7 tabs including Позиции and Заявки
3. Позиции tab: click [+ Добавить позицию], fill form with listing_type=equipment_rental, category=garden, name="Тест", base_price=1000, unit=₽/день, save → row appears in table with display_price > 1000 (markup applied)
4. Edit → toggle is_active → delete row — all work
5. Заявки tab: existing leads from 009_leads.sql appear; change status dropdown → row updates
6. Apply 010_leads_status.sql in Supabase SQL Editor
</verification>

<success_criteria>
- Admin can fully manage listings catalog from /admin (add, edit, hide, delete, photo upload)
- display_price auto-computed from base_price + markup_rates table via applyMarkup
- Admin can view and progress leads through status workflow
- All admin endpoints protected by ADMIN_PIN (same pattern as existing routes)
- No TypeScript errors introduced
</success_criteria>

<output>
After completion, create `.planning/quick/260402-rhw-admin-listings-leads-crud-user-id/260402-rhw-SUMMARY.md`
with: files created/modified, decisions made, any deviations from plan.
</output>
