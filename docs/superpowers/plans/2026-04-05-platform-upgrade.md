# Platform Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Upgrade Подряд PRO from lead-capture to full platform with customer orders, contractor registration, and admin CRM.

**Architecture:** Hybrid model — customers fill order form, admin assigns price/contractor, customer gets secret dashboard link. Contractors register via PWA/Telegram/MAX. Admin panel = lightweight CRM.

**Tech Stack:** Next.js 15, Supabase, Tailwind CSS, Leaflet, YooKassa, n8n, Lucide icons

**Spec:** `docs/superpowers/specs/2026-04-05-platform-upgrade-design.md`

---

## Phase 1: Database + API (Tasks 1-10)

### Task 1: Migration 011 — Create contractors, customer_tokens, ALTER orders

**Files:**
- `supabase/migrations/011_contractors_tokens.sql` (create)

**Steps:**

- [ ] Create migration file `supabase/migrations/011_contractors_tokens.sql` with the following SQL:

```sql
-- Migration 011: contractors, customer_tokens, orders columns
-- Platform upgrade: customer orders + contractor registration + admin CRM

-- ── 1. contractors table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'omsk',
  specialties TEXT[] NOT NULL DEFAULT '{}',
  experience TEXT,
  preferred_contact TEXT NOT NULL DEFAULT 'phone',  -- max | telegram | phone | email
  about TEXT,
  source TEXT NOT NULL DEFAULT 'pwa',                -- pwa | telegram | max
  telegram_id TEXT,
  max_id TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'new',                -- new | verified | active | blocked
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for admin queries: list by status, search by phone
CREATE INDEX IF NOT EXISTS idx_contractors_status ON contractors (status);
CREATE INDEX IF NOT EXISTS idx_contractors_phone ON contractors (phone);

-- RLS: service_role only (no anon access)
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

-- ── 2. customer_tokens table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  preferred_contact TEXT NOT NULL DEFAULT 'phone',   -- max | telegram | phone | email
  messenger_id TEXT,                                  -- MAX or Telegram user ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for token lookup (customer dashboard)
CREATE INDEX IF NOT EXISTS idx_customer_tokens_token ON customer_tokens (access_token);

-- RLS: service_role only
ALTER TABLE customer_tokens ENABLE ROW LEVEL SECURITY;

-- ── 3. orders table — new columns ─────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES contractors(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_lng DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS work_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS people_count INTEGER DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS hours INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_comment TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preferred_contact TEXT DEFAULT 'phone';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS display_price NUMERIC;

-- Index for customer orders lookup
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_contractor_id ON orders (contractor_id);
```

- [ ] Verify migration applies cleanly: `supabase db push` (or apply via Supabase dashboard)
- [ ] Commit: `feat(db): migration 011 — contractors, customer_tokens, orders columns`

---

### Task 2: TypeScript types — Add Contractor, CustomerToken interfaces

**Files:**
- `pwa/src/lib/types.ts` (modify — append at end)

**Steps:**

- [ ] Add the following interfaces at the end of `pwa/src/lib/types.ts`:

```typescript
// ── Platform Upgrade Types (2026-04-05) ───────────────────────

export type ContractorStatus = 'new' | 'verified' | 'active' | 'blocked';
export type PreferredContact = 'max' | 'telegram' | 'phone' | 'email';
export type ContractorSource = 'pwa' | 'telegram' | 'max';
export type OrderLifecycleStatus =
  | 'pending'
  | 'priced'
  | 'payment_sent'
  | 'paid'
  | 'in_progress'
  | 'confirming'
  | 'completed'
  | 'disputed';

export interface Contractor {
  id: string;
  name: string;
  phone: string;
  city: string;
  specialties: string[];
  experience?: string;
  preferred_contact: PreferredContact;
  about?: string;
  source: ContractorSource;
  telegram_id?: string;
  max_id?: string;
  email?: string;
  status: ContractorStatus;
  admin_notes?: string;
  created_at: string;
}

export interface CustomerToken {
  id: string;
  phone: string;
  access_token: string;
  preferred_contact: PreferredContact;
  messenger_id?: string;
  created_at: string;
}
```

- [ ] Verify: `npx tsc --noEmit` passes (from `pwa/` directory)
- [ ] Commit: `feat(types): add Contractor, CustomerToken interfaces`

---

### Task 3: DB functions — CRUD for contractors, customer_tokens

**Files:**
- `pwa/src/lib/db.ts` (modify — append at end)

**Steps:**

- [ ] Add the following functions at the end of `pwa/src/lib/db.ts`:

```typescript
// ── ИСПОЛНИТЕЛИ (contractors) ──────────────────────────────────

export async function createContractor(contractor: {
  name: string;
  phone: string;
  city?: string;
  specialties: string[];
  experience?: string;
  preferred_contact?: string;
  about?: string;
  source?: string;
  telegram_id?: string;
  max_id?: string;
  email?: string;
}) {
  const { data, error } = await db()
    .from('contractors')
    .insert({
      name: contractor.name,
      phone: contractor.phone,
      city: contractor.city ?? 'omsk',
      specialties: contractor.specialties,
      experience: contractor.experience ?? null,
      preferred_contact: contractor.preferred_contact ?? 'phone',
      about: contractor.about ?? null,
      source: contractor.source ?? 'pwa',
      telegram_id: contractor.telegram_id ?? null,
      max_id: contractor.max_id ?? null,
      email: contractor.email ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getContractors() {
  const { data, error } = await db()
    .from('contractors')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getContractorById(id: string) {
  const { data, error } = await db()
    .from('contractors')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

export async function updateContractor(id: string, updates: Record<string, unknown>) {
  const { error } = await db()
    .from('contractors')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

// ── CUSTOMER TOKENS ────────────────────────────────────────────

export async function getOrCreateCustomerToken(phone: string, preferredContact?: string) {
  // Try to find existing token
  const { data: existing } = await db()
    .from('customer_tokens')
    .select('*')
    .eq('phone', phone)
    .single();

  if (existing) return existing;

  // Create new token
  const { data, error } = await db()
    .from('customer_tokens')
    .insert({
      phone,
      preferred_contact: preferredContact ?? 'phone',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCustomerByToken(token: string) {
  const { data, error } = await db()
    .from('customer_tokens')
    .select('*')
    .eq('access_token', token)
    .single();
  if (error) return null;
  return data;
}

export async function getOrdersByCustomerPhone(phone: string) {
  const { data, error } = await db()
    .from('orders')
    .select('*')
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
```

- [ ] Verify: `npx tsc --noEmit` passes
- [ ] Commit: `feat(db): CRUD for contractors and customer_tokens`

---

### Task 4: POST /api/orders — Create order

**Files:**
- `pwa/src/app/api/orders/route.ts` (create)

**Steps:**

- [ ] Create directory `pwa/src/app/api/orders/` if it does not exist
- [ ] Create `pwa/src/app/api/orders/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getOrCreateCustomerToken } from '@/lib/db';

interface OrderBody {
  work_type: string;
  subcategory?: string;
  description?: string;
  address?: string;
  address_lat?: number;
  address_lng?: number;
  work_date?: string;
  people_count?: number;
  hours?: number;
  city?: string;
  phone: string;
  customer_name?: string;
  preferred_contact?: string;
}

function stripPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  let body: OrderBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const {
    work_type, subcategory, description, address,
    address_lat, address_lng, work_date, people_count,
    hours, city, phone, customer_name, preferred_contact,
  } = body;

  // Validate phone
  const digits = stripPhone(phone ?? '');
  if (digits.length < 10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 422 });
  }

  // Validate work_type
  const validWorkTypes = ['labor', 'equipment', 'materials', 'complex'];
  if (!work_type || !validWorkTypes.includes(work_type)) {
    return NextResponse.json({ error: 'invalid_work_type' }, { status: 422 });
  }

  const db = getServiceClient();

  // Insert order with status 'pending'
  const { data: order, error } = await db
    .from('orders')
    .insert({
      work_type,
      subcategory: subcategory ?? null,
      customer_comment: description ?? null,
      address: address ?? null,
      address_lat: address_lat ?? null,
      address_lng: address_lng ?? null,
      work_date: work_date ?? null,
      people_count: people_count ?? 1,
      hours: hours ?? null,
      customer_phone: digits,
      customer_name: customer_name ?? null,
      preferred_contact: preferred_contact ?? 'phone',
      status: 'pending',
      city: city ?? 'omsk',
    })
    .select()
    .single();

  if (error) {
    console.error('POST /api/orders:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  // Get or create customer token (for future dashboard access)
  let token: { access_token: string } | null = null;
  try {
    token = await getOrCreateCustomerToken(digits, preferred_contact);
  } catch (err) {
    console.error('getOrCreateCustomerToken error:', err);
  }

  // Fire-and-forget n8n webhook: order created
  const webhookUrl = process.env.N8N_ORDER_CREATED_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.order_id ?? order.id,
        work_type,
        subcategory,
        description,
        address,
        work_date,
        people_count: people_count ?? 1,
        hours,
        customer_phone: digits,
        customer_name,
        city: city ?? 'omsk',
        preferred_contact: preferred_contact ?? 'phone',
      }),
    }).catch((err) => console.error('n8n order-created webhook error:', err));
  }

  return NextResponse.json(
    { ok: true, order_id: order.order_id ?? order.id, access_token: token?.access_token ?? null },
    { status: 201 },
  );
}
```

- [ ] Verify: `npx tsc --noEmit` passes
- [ ] Commit: `feat(api): POST /api/orders — create customer order`

---

### Task 5: POST /api/contractors — Register contractor

**Files:**
- `pwa/src/app/api/contractors/route.ts` (create)

**Steps:**

- [ ] Create directory `pwa/src/app/api/contractors/` if it does not exist
- [ ] Create `pwa/src/app/api/contractors/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createContractor } from '@/lib/db';

interface ContractorBody {
  name: string;
  phone: string;
  city?: string;
  specialties: string[];
  experience?: string;
  preferred_contact?: string;
  about?: string;
  telegram_id?: string;
  max_id?: string;
  email?: string;
}

function stripPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  let body: ContractorBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { name, phone, city, specialties, experience, preferred_contact, about, telegram_id, max_id, email } = body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 422 });
  }

  const digits = stripPhone(phone ?? '');
  if (digits.length < 10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 422 });
  }

  if (!specialties || !Array.isArray(specialties) || specialties.length === 0) {
    return NextResponse.json({ error: 'invalid_specialties' }, { status: 422 });
  }

  const validCities = ['omsk', 'novosibirsk'];
  const safeCity = validCities.includes(city ?? '') ? city! : 'omsk';

  try {
    const contractor = await createContractor({
      name: name.trim(),
      phone: digits,
      city: safeCity,
      specialties,
      experience: experience ?? undefined,
      preferred_contact: preferred_contact ?? 'phone',
      about: about ?? undefined,
      telegram_id: telegram_id ?? undefined,
      max_id: max_id ?? undefined,
      email: email ?? undefined,
      source: 'pwa',
    });

    // Fire-and-forget n8n webhook: contractor registered
    const webhookUrl = process.env.N8N_CONTRACTOR_REGISTERED_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor_id: contractor.id,
          name: name.trim(),
          phone: digits,
          city: safeCity,
          specialties,
          preferred_contact: preferred_contact ?? 'phone',
        }),
      }).catch((err) => console.error('n8n contractor webhook error:', err));
    }

    return NextResponse.json({ ok: true, contractor_id: contractor.id }, { status: 201 });
  } catch (err) {
    console.error('POST /api/contractors:', err);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
```

- [ ] Verify: `npx tsc --noEmit` passes
- [ ] Commit: `feat(api): POST /api/contractors — contractor registration`

---

### Task 6: GET /api/orders/my — Customer orders by token

**Files:**
- `pwa/src/app/api/orders/my/route.ts` (create)

**Steps:**

- [ ] Create directory `pwa/src/app/api/orders/my/`
- [ ] Create `pwa/src/app/api/orders/my/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCustomerByToken, getOrdersByCustomerPhone } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }

  // Look up token -> get phone
  const customer = await getCustomerByToken(token);
  if (!customer) {
    return NextResponse.json({ error: 'token_not_found' }, { status: 404 });
  }

  // Get orders by customer phone
  const rawOrders = await getOrdersByCustomerPhone(customer.phone);

  // Return only safe fields — NEVER expose base_price, markup_percent
  const orders = rawOrders.map((o: Record<string, unknown>) => ({
    order_id: o.order_id ?? o.id,
    order_number: o.order_number ?? null,
    work_type: o.work_type,
    subcategory: o.subcategory ?? null,
    customer_comment: o.customer_comment ?? null,
    address: o.address ?? null,
    work_date: o.work_date ?? null,
    people_count: o.people_count ?? null,
    hours: o.hours ?? null,
    status: o.status,
    escrow_status: o.escrow_status ?? null,
    display_price: o.display_price ?? o.customer_total ?? null,
    created_at: o.created_at,
    customer_confirmed: o.customer_confirmed ?? null,
    supplier_confirmed: o.supplier_confirmed ?? null,
  }));

  return NextResponse.json({
    ok: true,
    phone: customer.phone,
    orders,
  });
}
```

- [ ] Verify: no `base_price`, `markup_percent`, `supplier_payout`, `platform_margin` in response
- [ ] Verify: `npx tsc --noEmit` passes
- [ ] Commit: `feat(api): GET /api/orders/my — customer orders by token`

---

### Task 7: POST /api/my/recover — Token recovery

**Files:**
- `pwa/src/app/api/my/recover/route.ts` (create)

**Steps:**

- [ ] Create directory `pwa/src/app/api/my/recover/`
- [ ] Create `pwa/src/app/api/my/recover/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

function stripPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  let body: { phone: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const digits = stripPhone(body.phone ?? '');
  if (digits.length < 10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 422 });
  }

  const db = getServiceClient();

  // Find token by phone
  const { data: tokenRow } = await db
    .from('customer_tokens')
    .select('access_token, preferred_contact, messenger_id')
    .eq('phone', digits)
    .single();

  if (!tokenRow) {
    // Return success anyway to not leak whether phone exists
    return NextResponse.json({ ok: true, message: 'Если номер зарегистрирован, ссылка будет отправлена' });
  }

  // Fire n8n webhook to send dashboard link via preferred messenger
  const webhookUrl = process.env.N8N_SEND_DASHBOARD_LINK_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: digits,
        access_token: tokenRow.access_token,
        preferred_contact: tokenRow.preferred_contact,
        messenger_id: tokenRow.messenger_id,
        action: 'recover',
      }),
    }).catch((err) => console.error('n8n recover webhook error:', err));
  }

  return NextResponse.json({ ok: true, message: 'Если номер зарегистрирован, ссылка будет отправлена' });
}
```

- [ ] Verify: response does not leak token directly (sent via messenger only)
- [ ] Verify: `npx tsc --noEmit` passes
- [ ] Commit: `feat(api): POST /api/my/recover — token recovery via messenger`

---

### Task 8: Admin contractors API

**Files:**
- `pwa/src/app/api/admin/contractors/route.ts` (create)

**Steps:**

- [ ] Create directory `pwa/src/app/api/admin/contractors/`
- [ ] Create `pwa/src/app/api/admin/contractors/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getContractors, updateContractor } from '@/lib/db';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const contractors = await getContractors();
    return NextResponse.json({ ok: true, contractors });
  } catch (err) {
    console.error('GET /api/admin/contractors:', err);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { id: string; status?: string; admin_notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'missing_id' }, { status: 422 });
  }

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.admin_notes !== undefined) updates.admin_notes = body.admin_notes;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_updates' }, { status: 422 });
  }

  try {
    await updateContractor(body.id, updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/admin/contractors:', err);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
```

- [ ] Verify: `npx tsc --noEmit` passes
- [ ] Commit: `feat(api): admin contractors API — GET + PUT`

---

### Task 9: Admin orders update API

**Files:**
- `pwa/src/app/api/admin/orders/[id]/route.ts` (create)

**Steps:**

- [ ] Create directory `pwa/src/app/api/admin/orders/[id]/`
- [ ] Create `pwa/src/app/api/admin/orders/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: Params) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: orderId } = await params;

  let body: {
    display_price?: number;
    contractor_id?: string;
    status?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.display_price !== undefined) {
    if (typeof body.display_price !== 'number' || body.display_price <= 0) {
      return NextResponse.json({ error: 'invalid_display_price' }, { status: 422 });
    }
    updates.display_price = body.display_price;
    updates.customer_total = body.display_price; // sync customer_total
  }

  if (body.contractor_id !== undefined) {
    updates.contractor_id = body.contractor_id;
  }

  if (body.status !== undefined) {
    const validStatuses = ['pending', 'priced', 'payment_sent', 'paid', 'in_progress', 'confirming', 'completed', 'disputed'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 422 });
    }
    updates.status = body.status;
  }

  // Auto-set status to 'priced' when price + contractor assigned
  if (updates.display_price && updates.contractor_id && !updates.status) {
    updates.status = 'priced';
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_updates' }, { status: 422 });
  }

  const db = getServiceClient();
  const { error } = await db
    .from('orders')
    .update(updates)
    .eq('order_id', orderId);

  if (error) {
    console.error('PUT /api/admin/orders/[id]:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] Verify: `npx tsc --noEmit` passes
- [ ] Commit: `feat(api): PUT /api/admin/orders/[id] — assign price and contractor`

---

### Task 10: Admin send-link API

**Files:**
- `pwa/src/app/api/admin/orders/[id]/send-link/route.ts` (create)

**Steps:**

- [ ] Create directory `pwa/src/app/api/admin/orders/[id]/send-link/`
- [ ] Create `pwa/src/app/api/admin/orders/[id]/send-link/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';
import { getOrCreateCustomerToken } from '@/lib/db';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: orderId } = await params;
  const db = getServiceClient();

  // Get order to find customer phone
  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('customer_phone, preferred_contact, status, display_price, order_id')
    .eq('order_id', orderId)
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
  }

  if (!order.customer_phone) {
    return NextResponse.json({ error: 'no_customer_phone' }, { status: 422 });
  }

  // Get or create customer token
  let tokenRow;
  try {
    tokenRow = await getOrCreateCustomerToken(order.customer_phone, order.preferred_contact);
  } catch (err) {
    console.error('getOrCreateCustomerToken error:', err);
    return NextResponse.json({ error: 'token_error' }, { status: 500 });
  }

  // Update order status to payment_sent
  await db
    .from('orders')
    .update({ status: 'payment_sent' })
    .eq('order_id', orderId);

  // Fire n8n webhook to send dashboard/payment link
  const webhookUrl = process.env.N8N_SEND_PAYMENT_LINK_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        phone: order.customer_phone,
        access_token: tokenRow.access_token,
        preferred_contact: tokenRow.preferred_contact ?? order.preferred_contact,
        messenger_id: tokenRow.messenger_id,
        display_price: order.display_price,
      }),
    }).catch((err) => console.error('n8n send-link webhook error:', err));
  }

  return NextResponse.json({ ok: true, access_token: tokenRow.access_token });
}
```

- [ ] Verify: `npx tsc --noEmit` passes
- [ ] Commit: `feat(api): POST /api/admin/orders/[id]/send-link — send payment link`

---

## Phase 2: Customer Pages (Tasks 11-13)

### Task 11: /order/new — Order creation page

**Files:**
- Create: `pwa/src/app/order/new/page.tsx`
- Create: `pwa/src/components/MapPicker.tsx`

**Steps:**

- [ ] Create `pwa/src/components/MapPicker.tsx` with dynamic Leaflet map (SSR-safe via dynamic import). Props: lat, lng, onSelect callback, city (for default center: Omsk 54.9885/73.3242 or Novosibirsk 55.0084/82.9357). Click handler updates lat/lng. Uses react-leaflet MapContainer, TileLayer, Marker, useMapEvents.

- [ ] Create `pwa/src/app/order/new/page.tsx` as a 'use client' component with full order form:
  - State: work_type, subcategory, description, address, address_lat, address_lng, work_date, people_count (default 1), hours, city ('omsk'), phone, customer_name, messenger ('MAX'), consent, loading, submitted
  - Category grid 2x2: labor (Users icon), equipment (Wrench), materials (Package), complex (Layers) — active = bg-brand-500 text-white
  - Subcategory chips (dynamic per work_type): labor=[Грузчики, Разнорабочие, Строители, Уборка, Благоустройство], equipment=[Экскаватор, Бульдозер, Самосвал, Погрузчик, Виброплита], materials=[Бетон, Щебень, Песок, Битум]
  - Description textarea (3 rows)
  - Address input + MapPicker component (dynamic import, ssr:false)
  - Date input type=date min=today
  - People count: minus(-) / value / plus(+) stepper, min 1
  - Hours number input
  - City toggle: Омск / Новосибирск
  - Phone (tel, required), Name (text)
  - Messenger chips: MAX / Telegram / Позвонить / Email
  - 152-ФЗ checkbox + /privacy link
  - Submit → POST /api/orders → success state
  - Design: rounded-[10px] buttons, min-h-[48px], shadow-card cards, font-heading, brand-500 primary

- [ ] Verify: page renders at /order/new, form submits correctly
- [ ] Commit: `feat(page): /order/new — order creation form with Leaflet map`

---

### Task 12: /my/[token] — Customer dashboard

**Files:**
- Create: `pwa/src/app/my/[token]/page.tsx`

**Steps:**

- [ ] Create 'use client' page that:
  - Reads token from params, fetches GET /api/orders/my?token={token}
  - Error state: if 404 → "Ссылка недействительна" + link to /my
  - Header: gradient #1E2A5A → #2F5BFF, shows phone, "+ Новый заказ" button → /order/new
  - Stats row (3 cols): Активных (blue), Завершено (green), Ожидает оплату (amber)
  - Order cards by status:
    - pending: gray badge "На рассмотрении"
    - priced/payment_sent: amber card, "Оплатить" → /order/{id}/pay, shows display_price
    - paid/in_progress: white card, "Подтвердить" → /order/{id}/confirm, "Спор" link
    - completed: faded green badge
    - disputed: red badge
  - Each card shows: order_number, work_type + subcategory, address, work_date, people/hours
  - SECURITY: only display_price shown, never base_price/markup

- [ ] Verify: renders with test data, no sensitive field leaks
- [ ] Commit: `feat(page): /my/[token] — customer dashboard`

---

### Task 13: /my — Token recovery page

**Files:**
- Create: `pwa/src/app/my/page.tsx`

**Steps:**

- [ ] Create 'use client' page with phone input form:
  - Title "Мои заказы", subtitle "Введите номер телефона — отправим ссылку"
  - Phone input (tel, required), submit button
  - POST /api/my/recover → success message "Ссылка отправлена! Проверьте мессенджер."
  - Design: centered layout, bg-surface, white card with shadow-elevated

- [ ] Verify: renders at /my, form works
- [ ] Commit: `feat(page): /my — token recovery`

---

## Phase 3: Contractor + Landing (Tasks 14-15)

### Task 14: /join — Contractor registration form

**Files:**
- Create: `pwa/src/app/join/page.tsx`

**Steps:**

- [ ] Create 'use client' page with contractor registration form:
  - State: name, phone, city, specialties (string[]), experience, preferred_contact, about, consent, loading, submitted
  - Name input (text, required)
  - Phone input (tel, required)
  - City toggle: Омск / Новосибирск
  - Specialties multi-select chips (toggle on/off): Грузчик, Разнорабочий, Строитель, Уборка территории, Водитель техники, Благоустройство — active chips = bg-brand-500 text-white
  - Experience input (text, optional): "3 года" etc
  - Preferred contact chips: MAX (bg-[#2787F5]), Telegram (bg-[#229ED9]), Позвонить (bg-green-500), Email (bg-gray-200)
  - About textarea (optional, 3 rows)
  - 152-ФЗ checkbox + /privacy link
  - Submit → POST /api/contractors → success "Анкета отправлена! Мы свяжемся с вами."
  - Design: max-w-lg centered, bg-surface, white card shadow-elevated

- [ ] Verify: page renders at /join, submits correctly
- [ ] Commit: `feat(page): /join — contractor registration form`

---

### Task 15: Landing page CTA updates

**Files:**
- Modify: `pwa/src/app/page.tsx`

**Steps:**

- [ ] Update hero CTA button: change href from `#lead-form` to `/order/new`, change text to "Разместить заказ"
- [ ] Update hero secondary logic: keep `#lead-form` anchor for quick leads
- [ ] Update "Для исполнителей" section buttons:
  - "Написать в MAX" → change href to `/join`, text to "Заполнить анкету"
  - "Telegram" → change href to `/join`, text to "Стать исполнителем"
- [ ] Add navbar link: "Для исполнителей" → /join (small text link)
- [ ] Keep existing lead form section as secondary entry point (scroll target)
- [ ] Update mobile sticky CTA: href to `/order/new`, text "Разместить заказ"

- [ ] Verify: all links work, no broken anchors
- [ ] Commit: `feat(landing): update CTAs to link to /order/new and /join`

---

## Phase 4: Admin Panel (Tasks 16-17)

### Task 16: Admin contractors tab (CRM)

**Files:**
- Modify: `pwa/src/app/admin/page.tsx`

**Steps:**

- [ ] Add Contractor interface to admin page (or import from types.ts)
- [ ] Add to TabId union: 'contractors'
- [ ] Add to TABS array: `{ id: 'contractors', label: 'Исполнители', icon: UserPlus }` — position after 'leads'
- [ ] Create ContractorsTab component:
  - Fetch GET /api/admin/contractors with x-admin-pin header
  - Display cards for each contractor:
    - Avatar circle with initials (gradient bg)
    - Name, phone, city, source badge (pwa/telegram/max)
    - Specialties as colored chips
    - Status badge: new=gray, verified=blue, active=green, blocked=red
    - Preferred contact highlighted
    - 4 contact buttons row:
      - MAX: bg-[#2787F5] text-white, href=`https://max.im/search?q=${phone}`
      - Telegram: bg-[#229ED9] text-white, href=`https://t.me/+${phone}` (or t.me/${telegram_id})
      - Phone: bg-green-500 text-white, href=`tel:+${phone}`
      - Email: bg-gray-100 text-gray-800, href=`mailto:${email}` (disabled if no email)
    - Status dropdown (select): new/verified/active/blocked → PUT /api/admin/contractors
    - Admin notes textarea (save on blur)
  - Search/filter by name, phone, or specialty

- [ ] Verify: tab renders, contact buttons open correct links
- [ ] Commit: `feat(admin): contractors CRM tab with 4-channel contact buttons`

---

### Task 17: Admin orders tab upgrade

**Files:**
- Modify: `pwa/src/app/admin/page.tsx`

**Steps:**

- [ ] Upgrade OrdersTab to show new order fields:
  - Display: customer_phone, customer_name, address, work_date, people_count, hours, subcategory, customer_comment, preferred_contact
  - Status badge with lifecycle colors (see Task 12 badge colors)
  - For orders with status='pending' or 'priced': show inline edit form:
    - Price input (display_price): number field
    - Contractor dropdown: fetch from /api/admin/contractors, show name + specialties
    - "Назначить" button → PUT /api/admin/orders/[id] with display_price + contractor_id
  - For orders with status='priced': show "Отправить ссылку на оплату" button → POST /api/admin/orders/[id]/send-link
  - For all orders: show customer contact buttons (same 4 buttons as contractor CRM, using customer_phone + preferred_contact)

- [ ] Fetch orders with new fields: update admin orders API query to include new columns
- [ ] Add GET handler to /api/admin/orders/route.ts if not exists (or create it) — returns all orders with new fields, PIN-protected

- [ ] Verify: orders display correctly, assign works, send-link works
- [ ] Commit: `feat(admin): orders tab upgrade — assign price/contractor, send payment link`

---

## Phase 5: N8N + Polish (Task 18)

### Task 18: N8N workflows + build verification

**Files:**
- Create: `workflows/14-order-created.json`
- Create: `workflows/15-contractor-registered.json`
- Create: `workflows/16-send-dashboard-link.json`
- Create: `workflows/17-send-payment-link.json`
- Verify: `pwa/` build

**Steps:**

- [ ] Create workflow 14-order-created.json:
  - Trigger: Webhook (POST)
  - Node 1: Format message — "Новый заказ: {work_type} / {subcategory}, {address}, {work_date}, {people_count} чел., {hours} ч. Тел: {phone}, Мессенджер: {preferred_contact}"
  - Node 2: Telegram Send Message → admin chat (TELEGRAM_ADMIN_CHAT_ID)
  - Node 3: MAX Send Message → admin (MAX_ADMIN_USER_ID)
  - Error handler: Telegram notify admin

- [ ] Create workflow 15-contractor-registered.json:
  - Trigger: Webhook (POST)
  - Format: "Новый исполнитель: {name}, {phone}, {city}, Специальности: {specialties}, Контакт: {preferred_contact}"
  - Send to Telegram admin + MAX admin

- [ ] Create workflow 16-send-dashboard-link.json:
  - Trigger: Webhook (POST)
  - IF preferred_contact = 'max': Send MAX message with dashboard_url
  - IF preferred_contact = 'telegram': Send Telegram message with dashboard_url
  - IF preferred_contact = 'email': Send email (optional, via SMTP or skip for v1)
  - ELSE: notify admin to send manually

- [ ] Create workflow 17-send-payment-link.json:
  - Trigger: Webhook (POST)
  - Same routing logic as workflow 16 but with payment link text
  - Message: "Ваш заказ готов к оплате. Сумма: {display_price} руб. Оплатить: {payment_url}"

- [ ] Add env vars to .env.local (document in README):
  ```
  N8N_ORDER_CREATED_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/order-created
  N8N_CONTRACTOR_REGISTERED_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/contractor-registered
  N8N_SEND_DASHBOARD_LINK_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/send-dashboard-link
  N8N_SEND_PAYMENT_LINK_WEBHOOK_URL=https://astra55.app.n8n.cloud/webhook/send-payment-link
  ```

- [ ] Run build: `cd pwa && npm run build` — verify 0 errors
- [ ] Run lint: `npm run lint` — fix any issues
- [ ] Verify all new pages render: /order/new, /join, /my, /my/test-token, /admin (all tabs)
- [ ] Commit: `feat(n8n): workflows 14-17 + build verification`

---

## Execution Checklist

| Phase | Tasks | Key Deliverables |
|-------|-------|-----------------|
| 1 | 1-10 | Migration, types, db functions, 7 API routes |
| 2 | 11-13 | /order/new, /my/[token], /my pages |
| 3 | 14-15 | /join page, landing CTA updates |
| 4 | 16-17 | Admin contractors CRM + orders upgrade |
| 5 | 18 | 4 n8n workflows + production build |
