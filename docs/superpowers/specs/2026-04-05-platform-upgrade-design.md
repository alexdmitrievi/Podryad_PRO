# Подряд PRO — Platform Upgrade Design Spec

**Date:** 2026-04-05
**Status:** Approved
**Scope:** Customer orders, contractor registration, admin CRM, UX overhaul

---

## 1. Overview

Upgrade Подряд PRO from a lead-capture landing page to a full-featured construction services platform with three core flows:

1. **Customers** place detailed orders and track them on a personal dashboard
2. **Contractors** register via PWA, Telegram, or MAX — admin contacts them through their preferred channel
3. **Admin** manages everything from an upgraded panel with built-in CRM

### Business model (unchanged)
- Hidden markup: customers see `display_price`, contractors receive `base_price` (100%)
- Platform appears free for contractors
- YooKassa escrow payments with dual confirmation
- `base_price` and `markup_percent` never exposed in public APIs

---

## 2. Decisions Log

| # | Question | Decision |
|---|----------|----------|
| 1 | Customer journey model | **Hybrid**: detailed order form + personal dashboard, admin assigns price & contractor |
| 2 | Contractor registration channels | **PWA full form + Telegram/MAX bots** via n8n, minimal data from bots, admin fills rest |
| 3 | Admin contact channels | **All 4**: MAX, Telegram, phone (tel:), email (mailto:) |
| 4 | Contractor form fields | PWA: name, phone, city, specialties, experience, preferred contact, about, 152-FZ. Bot: name, phone, specialty, city |
| 5 | Order form structure | Type → subcategory → description → address+map → date/people/hours → contacts → submit |
| 6 | Customer dashboard | Stats bar + active orders (pay/confirm/dispute actions) + completed with ratings |
| 7 | Authentication | **Secret link via messenger** — unique token URL, no SMS, no registration |
| 8 | App structure | Approved full sitemap (see Section 4) |

---

## 3. Architecture

### 3.1 Customer Flow

```
Landing (/) or /order/new
  → Customer fills detailed order form
  → POST /api/orders (creates order in Supabase, status: "pending")
  → n8n webhook: notify admin via Telegram + MAX
  → Admin reviews in /admin → assigns display_price + contractor
  → n8n sends secret dashboard link to customer via preferred messenger
  → Customer opens /my/{token} → sees order with "Awaiting payment" status
  → Customer clicks "Pay" → /order/{id}/pay → YooKassa escrow
  → Work happens → Customer confirms → /order/{id}/confirm
  → Escrow captured → contractor paid out
```

### 3.2 Contractor Flow

```
PWA /join form OR Telegram/MAX bot
  → Data saved to `contractors` table in Supabase
  → n8n webhook: notify admin with contractor details
  → Admin sees contractor in /admin "Исполнители" tab
  → Admin clicks preferred contact button (MAX/TG/phone/email)
  → Admin assigns contractor to an order
  → Contractor receives job details via messenger
```

### 3.3 Auth Model (Secret Link)

- No user accounts, no passwords, no SMS
- When admin sends dashboard link, a unique `access_token` (UUID v4) is generated and stored with the customer's phone
- URL format: `/my/{access_token}`
- Token is permanent per customer (same token for all their orders)
- Lost token: customer enters phone on /my → POST /api/my/recover → n8n sends link via `customer_tokens.preferred_contact` using `messenger_id` (MAX/Telegram user ID) or email
- If customer has no messenger_id (e.g. entered via phone call), admin sends link manually from admin panel
- Security: token is 128-bit UUID — practically unguessable

---

## 4. Sitemap

### 4.1 Public Pages

| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Landing page (hero, services, safe deal, lead form) | Exists — update CTA links |
| `/order/new` | Customer order creation form | **NEW** |
| `/join` | Contractor registration form | **NEW** |
| `/privacy` | 152-FZ privacy policy | Exists |

### 4.2 Customer Dashboard (secret link)

| Route | Purpose | Status |
|-------|---------|--------|
| `/my/[token]` | Customer dashboard — order list, stats, actions | **NEW** |
| `/my` | Token recovery — enter phone, get link via messenger | **NEW** |
| `/order/[id]/pay` | YooKassa escrow payment | Exists |
| `/order/[id]/confirm` | Dual-party work confirmation | Exists |
| `/order/[id]/status` | Order status timeline | Exists |

### 4.3 Admin Panel

| Route | Purpose | Status |
|-------|---------|--------|
| `/admin` | Admin panel with updated tabs | Exists — **UPGRADE** |

Admin tabs:
1. **Заказы** — all orders + assign price/contractor + send payment link
2. **Исполнители** — contractor CRM with 4 contact buttons (MAX/TG/phone/email)
3. **Заявки** — incoming leads from landing form
4. **Каталог** — listings CRUD
5. **Наценки** — markup rates editor
6. **Статистика** — platform metrics

---

## 5. Database Changes

### 5.1 New Table: `contractors`

```sql
CREATE TABLE contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'omsk',
  specialties TEXT[] NOT NULL DEFAULT '{}',
  experience TEXT,
  preferred_contact TEXT NOT NULL DEFAULT 'phone', -- max, telegram, phone, email
  about TEXT,
  source TEXT NOT NULL DEFAULT 'pwa', -- pwa, telegram, max
  telegram_id TEXT,
  max_id TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new, verified, active, blocked
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5.2 New Table: `customer_tokens`

```sql
CREATE TABLE customer_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  preferred_contact TEXT NOT NULL DEFAULT 'phone',
  messenger_id TEXT, -- MAX or Telegram ID for sending links
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5.3 Order Status Lifecycle

```
pending → priced → payment_sent → paid (escrow held) → in_progress → confirming → completed
                                                                    → disputed
```

| Status | Meaning | Who sets it |
|--------|---------|-------------|
| `pending` | Order created by customer, awaiting admin review | System (on create) |
| `priced` | Admin assigned display_price and contractor | Admin |
| `payment_sent` | Payment link sent to customer | Admin (via n8n) |
| `paid` | Customer paid, escrow held | System (YooKassa callback) |
| `in_progress` | Work started | Admin |
| `confirming` | One party confirmed, awaiting second | System |
| `completed` | Both parties confirmed, payout initiated | System |
| `disputed` | Dispute opened | Customer or contractor |

### 5.4 Orders Table Changes

Add columns to existing `orders` table:

```sql
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
```

---

## 6. API Endpoints

### 6.1 New Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/orders` | Create new order from customer form |
| GET | `/api/orders/my?token={token}` | Get customer's orders by access token |
| POST | `/api/contractors` | Register contractor (from PWA form) |
| GET | `/api/admin/contractors` | List all contractors (admin) |
| PUT | `/api/admin/contractors/[id]` | Update contractor (admin notes, status) |
| PUT | `/api/admin/orders/[id]` | Assign price/contractor to order (admin) |
| POST | `/api/admin/orders/[id]/send-link` | Send payment/dashboard link via messenger |
| POST | `/api/my/recover` | Recover dashboard token by phone (sends via messenger) |

### 6.2 Existing Endpoints (unchanged)

- `POST /api/leads` — landing form submissions
- `GET /api/listings/public` — public catalog
- `POST /api/payments/create-escrow` — YooKassa hold
- `POST /api/payments/callback` — YooKassa webhook
- `POST /api/orders/[id]/confirm` — dual confirmation
- `POST /api/orders/[id]/dispute` — dispute
- `GET /api/cron/capture-expired` — auto-capture
- `POST /api/admin/verify-pin` — admin auth
- `GET/POST /api/admin/listings` — listings CRUD
- `GET /api/admin/leads` — leads list

---

## 7. N8N Automations

### 7.1 New/Updated Workflows

| # | Workflow | Trigger | Actions |
|---|---------|---------|---------|
| 14 | `order-created` | Webhook from POST /api/orders | Notify admin (TG + MAX) with order details |
| 15 | `contractor-registered` | Webhook from POST /api/contractors | Notify admin with contractor details + preferred contact |
| 16 | `send-dashboard-link` | Webhook from admin panel | Send /my/{token} link to customer via MAX/TG/email |
| 17 | `send-payment-link` | Webhook from admin panel | Send /order/{id}/pay link to customer via messenger |

### 7.2 Existing Workflows (keep as-is)

- `11-lead-notification.json` — landing form → admin notification
- `12-payment-held.json` — payment hold → notify parties
- `13-payout-reminder.json` — manual payout → admin reminder

### 7.3 Workflows Requiring Migration (future, not in scope)

- Workflows 01-10: Still use Google Sheets, need migration to Supabase
- Not blocking current implementation — new workflows work independently

---

## 8. UI/UX Design Guidelines

### 8.1 Design System (existing, maintained)

- **Font**: Manrope (headings), Inter (body)
- **Primary**: #2F5BFF (brand-500), #1E2A5A (brand-900)
- **Accent**: #f5a623 (gold), #6C5CE7 (violet)
- **Messenger colors**: MAX #2787F5, Telegram #229ED9
- **Radius**: 10px buttons, 12px cards, 14px large cards
- **Shadows**: card / card-hover / elevated / glow tokens
- **Animations**: scroll-reveal (IntersectionObserver), count-up, stagger delays
- **Touch targets**: min 48px height, 44x44px tap area

### 8.2 New Components

1. **OrderForm** — multi-field form with Leaflet map, category chips, stepper counter
2. **ContractorForm** — registration form with specialty multi-select, contact preference
3. **CustomerDashboard** — stats bar + order cards with status badges and action buttons
4. **OrderCard** — status-colored card (yellow=awaiting payment, white=in progress, green=complete)
5. **ContactButtons** — row of messenger/phone/email buttons for admin CRM
6. **ContractorCard** — admin view of contractor with specialties, status, contact buttons
7. **TokenRecovery** — phone input + "send link" form for /my page

### 8.3 Mobile-First Approach

- All new pages: mobile-first responsive design
- Landing CTA updated: "Разместить заказ" → links to /order/new
- Sticky mobile CTA on /order/new
- Dashboard optimized for phone screens
- Admin panel: responsive but desktop-primary

---

## 9. Security

- `access_token` is UUID v4 (128-bit) — computationally infeasible to guess
- Customer tokens are permanent and unique per phone
- No sensitive data (base_price, markup) exposed in customer-facing APIs
- 152-FZ consent checkbox mandatory on /order/new and /join
- Admin PIN auth maintained (existing system)
- RLS policies on new tables: contractors (service_role only), customer_tokens (service_role only)
- n8n webhooks: fire-and-forget, non-blocking

---

## 10. Implementation Phases (high-level)

### Phase 1: Database + API Layer
- Migration: contractors table, customer_tokens table, orders columns
- API endpoints: /api/orders, /api/contractors, /api/orders/my, /api/my/recover
- Admin API: /api/admin/contractors, /api/admin/orders/[id]

### Phase 2: Customer-Facing Pages
- /order/new — order creation form with Leaflet map
- /my/[token] — customer dashboard
- /my — token recovery page
- Update landing page CTAs

### Phase 3: Contractor Registration
- /join — PWA registration form
- Update landing "Для исполнителей" section with /join link

### Phase 4: Admin Panel Upgrade
- Contractors tab with CRM contact buttons
- Orders tab upgrade: assign price, contractor, send links
- Leads tab (already exists, polish)

### Phase 5: N8N Automations
- Workflow 14: order-created notification
- Workflow 15: contractor-registered notification
- Workflow 16: send-dashboard-link
- Workflow 17: send-payment-link

### Phase 6: UX Polish + Build
- Animations, transitions, loading states
- Error handling, edge cases
- PWA rebuild (service worker, manifest)
- Production build verification

---

## 11. Out of Scope

- Workflows 01-10 migration (Google Sheets → Supabase)
- Telegram/MAX bot code (bots feed data via n8n, not custom bot code)
- Rating system UI (backend exists, UI deferred)
- Push notifications
- Contractor self-service dashboard
- Full-text search / filtering in catalog
