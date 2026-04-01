# Phase 1: Escrow Core - Research

**Researched:** 2026-04-01
**Domain:** YooKassa 2-stage payments, Supabase pg_cron/pg_net, PostgreSQL migrations, Next.js 15 App Router
**Confidence:** MEDIUM-HIGH (core API patterns HIGH; payouts contract requirements MEDIUM)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Add escrow columns to EXISTING orders table (not a new table). Telegram bot must not break.
- D-02: Both parties confirm via PWA /order/[id]/confirm?role=customer|supplier&token=<jwt>. JWT is short-lived (24h).
- D-03: Auto-capture cron via Supabase pg_cron + pg_net. Fallback: GitHub Actions.
- D-04: Add payout_card TEXT + is_selfemployed_verified BOOLEAN to workers table. inn from users via FK.
- D-05: New tables: escrow_ledger + disputes (separate, not in orders).
- D-06: Extend yukassa.ts with createEscrowPayment(), capturePayment(), createPayout(). Keep createPayment() unchanged.

### Claude Discretion
- Structure of confirmation JWT (algorithm and payload)
- Exact webhook signature verification approach
- Design of /order/[id]/confirm page (waiting state + confirmed state)
- Design of /order/[id]/status page (return URL after payment)

### Deferred (OUT OF SCOPE)
- Unified listings table (labor/material/equipment) -> Phase 3
- Crew/brigade support in suppliers -> Phase 4
- Super-admin arbitration panel for disputes -> Phase 5
</user_constraints>
## Summary

Phase 1 implements a full escrow payment flow on top of an existing Next.js 15 + Supabase stack. The core mechanism is YooKassa two-stage payment: creating with capture:false blocks funds; an explicit POST to /payments/{id}/capture releases them. For bank cards the hold window is 7 days, giving the 6-day auto-capture window a safe 1-day margin.

The existing codebase is well-prepared. auth.ts implements HS256 JWT with signPodryadSession() - the same logic can produce confirmation tokens by adding a purpose:confirm field and 24h expiry. yukassa.ts already builds Basic Auth headers correctly; three new functions are additive. The webhook route at /api/payments/callback uses a single event-switch pattern, ready for a new payment.waiting_for_capture case.

Payouts to executors require a SEPARATE YooKassa Payouts agent contract with distinct credentials (YUKASSA_PAYOUT_AGENT_ID + YUKASSA_PAYOUT_SECRET). Without PCI DSS, payout card collection must use the YooKassa Payout Widget to exchange card details for a card synonym. This is the highest-risk integration decision.

**Primary recommendation:** Use TEXT + CHECK constraint for escrow_status (not a PostgreSQL ENUM) to avoid the IF NOT EXISTS workaround complexity. Reuse existing JWT signing for confirmation tokens. Add payment.waiting_for_capture as a new case in the existing webhook route rather than creating a separate endpoint.
## YooKassa Escrow API (2-Stage Payment)

**Confidence: HIGH** - verified against official YooKassa documentation and SDK examples.

### How 2-Stage Payment Works

1. Create payment with capture:false. YooKassa creates a hold on the payer card.
2. Payment transitions to status waiting_for_capture.
3. YooKassa sends webhook event payment.waiting_for_capture to your endpoint.
4. Your system records yookassa_payment_id and sets escrow_status = payment_held.
5. After both parties confirm, call POST /payments/{id}/capture to release funds.
6. If dispute or cancellation needed, call POST /payments/{id}/cancel.

### Hold Duration by Payment Method

| Method | Hold Duration |
|---|---|
| Bank card (Visa/MasterCard/Mir) | **7 days** |
| YooMoney Wallet | **7 days** |
| Other methods (SBP, etc.) | **6 hours** |

The exact deadline is stored in the expires_at field of the payment object.
Auto-capture at 6 days (D-03) is safe for bank cards - 1 day buffer before YooKassa auto-cancels.

### Create Escrow Payment Request

Endpoint: POST https://api.yookassa.ru/v3/payments
Auth: Basic Auth (YUKASSA_SHOP_ID:YUKASSA_SECRET_KEY)
Required header: Idempotence-Key

Key difference from existing createPayment(): capture:false



### Capture Payment Request

Endpoint: POST https://api.yookassa.ru/v3/payments/{payment_id}/capture
Auth: Same Basic Auth as payment creation
Required header: Idempotence-Key (generate new UUID per capture attempt)

For FULL capture (entire held amount): send empty body or just amount field.
For PARTIAL capture: must include receipt object with updated items.

Since this project always captures the full held amount, no receipt is needed in the capture call.



### Cancel Payment Request

Endpoint: POST https://api.yookassa.ru/v3/payments/{payment_id}/cancel
Body: {} (empty)
No receipt required for cancellation.

### Receipt Format for 54-FZ (УСН Доходы)

Business: IP Zhbankov A.D., УСН Доходы 6% - no VAT.

| Field | Value |
|---|---|
| tax_system_code | 2 (УСН Доходы) |
| vat_code | 1 (Без НДС) |
| payment_subject | service |
| payment_mode | full_payment |

Two receipt items:
- Item 1: subtotal amount (work performed) - description includes order details
- Item 2: service_fee (platform commission)
Total of items must equal payment amount.
Customer phone must be provided (not email) for SMS receipts.
## YooKassa Payouts API

**Confidence: MEDIUM** - endpoint confirmed from docs; PCI DSS constraint is a critical implementation blocker.

### Key Facts

- Separate API base: https://payouts.yookassa.ru/v3/payouts
- Requires a SEPARATE agent contract with YooKassa (not the same as payments)
- Separate credentials: YUKASSA_PAYOUT_AGENT_ID (agent ID from Payouts settings) + YUKASSA_PAYOUT_SECRET
- Only individuals (физлица) can receive payouts via this API

### PCI DSS Constraint (CRITICAL)

To send raw card numbers in the API request, a PCI DSS compliance certificate is required.
Without PCI DSS: MUST use the YooKassa Payout Widget to collect card details.

The Payout Widget runs on YooKassa servers and returns a card_synonym (a token representing the card).
This synonym is stored in workers.payout_card and sent in subsequent payout requests.
Card synonyms do NOT expire and can be reused for future payouts to the same card.

### Payout Request (using card synonym)



### Payout Widget Integration

1. Executor visits their profile page in PWA
2. PWA loads the YooKassa Payout Widget (JavaScript embed)
3. Executor enters card details in the widget form (hosted by YooKassa)
4. Widget calls back with card_synonym
5. PWA saves card_synonym to workers.payout_card via /api/workers/update-payout-card

Source: https://yookassa.ru/developers/payouts/making-payouts/bank-card/using-payout-widget/basics

### Self-Employed Verification

workers.is_selfemployed_verified must be true before first payout.
YooKassa can auto-send tax receipts for self-employed executors if inn is provided.
inn is already in users table; join via workers.user_phone -> users.phone.
## Supabase pg_cron + pg_net for Auto-Capture

**Confidence: HIGH** - verified against Supabase official documentation.

### Extension Setup

Both extensions are pre-installed in Supabase projects. Enable via SQL or Dashboard:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### pg_net HTTP POST Signature

```sql
net.http_post(
  url text,
  body jsonb DEFAULT '{}'::jsonb,
  params jsonb DEFAULT '{}'::jsonb,
  headers jsonb DEFAULT '{"Content-Type": "application/json"}'::jsonb,
  timeout_milliseconds int DEFAULT 1000
) RETURNS bigint  -- async request_id, NOT the HTTP response
```

Important: pg_net is ASYNCHRONOUS. It fires the request and returns a request_id immediately.
Responses stored in net._http_response for 6 hours. Use PERFORM in void functions.

### Architecture: pg_cron -> pg_net -> Next.js -> YooKassa

Do NOT call YooKassa directly from SQL (credentials would be stored in DB).
Instead: cron fires HTTP POST to /api/cron/capture-expired (Next.js route),
which reads YUKASSA_SECRET_KEY from env and calls YooKassa.

### Schedule: 09:00 MSK = 06:00 UTC

pg_cron runs in UTC. Russia MSK = UTC+3 (no DST). Cron expression: `0 6 * * *`

### Registration SQL (in migration 006_escrow.sql)

```sql
SELECT cron.schedule(
  'auto-capture-escrow-holds',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.site_url') || '/api/cron/capture-expired',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.cron_secret')
      ),
      body := '{}'::jsonb
    );
  $$
);
```

Store secrets: `ALTER DATABASE postgres SET app.cron_secret = 'random-secret-here';`
Or use Supabase Vault: `SELECT vault.create_secret('cron_secret', 'value');`

### Monitoring

```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
SELECT * FROM net._http_response WHERE status_code >= 400 ORDER BY created DESC LIMIT 20;
```

### GitHub Actions Fallback

workflow file: .github/workflows/capture-expired.yml
schedule: '0 6 * * *'
step: curl -X POST $SITE_URL/api/cron/capture-expired -H "Authorization: Bearer $CRON_SECRET"


## Webhook Signature Verification

**Confidence: HIGH** - IP ranges from official YooKassa SDK PHP issue #26 and nestjs-yookassa documentation.

### YooKassa's Official Approach

YooKassa does NOT use HMAC signatures on webhook payloads. Their recommended verification is:
1. Check that the request IP is in YooKassa's known CIDR ranges
2. Re-fetch the payment object via GET /payments/{id} to confirm the status

This "verify by re-fetching" approach is the most secure: even if an attacker spoofs the IP, the re-fetch using your credentials will return the real status.

### Official YooKassa IP Ranges

```
185.71.76.0/27
185.71.77.0/27
77.75.153.0/25
77.75.156.11/32
77.75.156.35/32
77.75.154.128/25
2a02:5180::/32
```

Source: nestjs-yookassa.ru/docs/webhooks/security and yoomoney/yookassa-sdk-php issues.

### Retry Schedule

If your endpoint returns non-200, YooKassa retries 7 times over 24 hours.
Retry intervals (seconds): 10, 42, 84, 168, 672, 5376, 86016
Always return 200 immediately, then process async (or in the same handler after 200 is ensured).

### Implementation in Next.js App Router

Two approaches (choose based on deployment):

**Option A: Middleware-based IP check (recommended for Vercel)**
- Create middleware.ts that matches /api/webhooks/yookassa
- Extract IP from x-forwarded-for header (first value)
- Check against YooKassa CIDR ranges using CIDR math
- Return 403 if not in range

**Option B: Inline check in route handler (simpler, for self-hosted)**
- Check IP at start of POST handler
- Skip check in dev/test environments (allow all IPs when NODE_ENV=development)

**Critical: Existing webhook is at /api/payments/callback (not /api/webhooks/yookassa)**
Per CONTEXT.md the existing callback route is extended, not replaced.
Either add IP check to the existing /api/payments/callback route, or
register a new webhook URL with YooKassa for escrow events and keep them separate.
Per CONTEXT.md code_context: "добавить обработку payment.waiting_for_capture" in the existing route.

### Recommended: Extend Existing Route

The existing /api/payments/callback route:
1. Currently handles payment.succeeded only
2. Does NOT have IP verification
3. Should be extended to add both IP verification AND the new event case


## Confirmation JWT Pattern

**Confidence: HIGH** - directly derived from existing auth.ts code which already implements HS256 JWT.

### Existing JWT Infrastructure

auth.ts already has:
- `signPodryadSession()` - signs HS256 JWT with HMAC-SHA256
- `getSession()` - verifies and parses session JWT from cookie
- `base64UrlEncodeJson()`, `base64UrlEncodeBuffer()` - URL-safe base64 helpers
- Uses `process.env.SESSION_SECRET` as signing key

### Confirmation Token Design (Claude's Discretion)

Reuse the exact same signing mechanism. Add a new sign/verify function pair:
`signConfirmationToken(params)` and `verifyConfirmationToken(token)`.

Payload structure:
```typescript
{
  purpose: 'escrow_confirm',  // distinguishes from session tokens
  orderId: string,
  role: 'customer' | 'supplier',
  sub: string,                // phone number of the confirming party
  exp: number                 // now() + 86400 (24h)
}
```

Key choice: Use `SESSION_SECRET` (same as session tokens) - no new env var needed.
Purpose field prevents accidental cross-use with session tokens.

Delivery:
- Customer: SMS link via n8n webhook + Telegram notification
- Supplier: Telegram bot message from @Podryad_PRO_bot

Link format: https://podryad.pro/order/{id}/confirm?role=customer&token={jwt}

### Token Verification in API Route

```typescript
// In POST /api/orders/[id]/confirm
const { role, token } = searchParams;
const payload = verifyConfirmationToken(token);
if (!payload || payload.orderId !== id || payload.role !== role) {
  return 401;
}
// Proceed to update customer_confirmed or supplier_confirmed
```

### HMAC Algorithm Used

The existing auth.ts uses: createHmac('sha256', secret).update(signingInput).digest()
This is HS256 (HMAC-SHA256). Same algorithm for confirmation tokens.


## PostgreSQL ENUM Migration Pattern

**Confidence: HIGH** - documented PostgreSQL limitation with well-known workaround.

### The Problem

PostgreSQL does NOT support `CREATE TYPE IF NOT EXISTS` for ENUM types (as of 2025).
Native ENUM has additional issues: values cannot be removed, and ALTER TYPE ADD VALUE
cannot run inside a transaction.

### Recommended Approach: TEXT + CHECK Constraint

Per CONTEXT.md D-01, escrow_status is added as TEXT with CHECK constraint:

```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS escrow_status TEXT NOT NULL DEFAULT ''
    CHECK (escrow_status IN ('', 'payment_held', 'in_progress', 'pending_confirm', 'completed', 'disputed', 'cancelled'));
```

Advantages:
- ALTER TABLE ADD COLUMN IF NOT EXISTS is idempotent (safe to re-run)
- Values can be added to the CHECK constraint in future migrations
- No ENUM type management needed
- Telegram bot reads existing `status` field, ignores `escrow_status`

### If ENUM is Truly Needed (workaround)

```sql
DO $$ BEGIN
  CREATE TYPE escrow_status_enum AS ENUM ('payment_held', 'in_progress', 'pending_confirm', 'completed', 'disputed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

### Migration File Naming

Follow existing pattern: `supabase/migrations/006_escrow.sql`
Next available number is 006 (after 005_marketplace.sql).

### Full Migration 006 Structure

```sql
-- 1. ALTER TABLE orders ADD COLUMN IF NOT EXISTS for each new column
-- 2. ALTER TABLE workers ADD COLUMN IF NOT EXISTS payout_card TEXT
-- 3. ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_selfemployed_verified BOOLEAN DEFAULT false
-- 4. CREATE TABLE IF NOT EXISTS escrow_ledger (...)
-- 5. CREATE TABLE IF NOT EXISTS disputes (...)
-- 6. RLS policies for new tables
-- 7. pg_cron schedule registration
-- 8. Indexes for new columns
```

### New Table Structures

escrow_ledger:
```sql
CREATE TABLE IF NOT EXISTS escrow_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('hold', 'capture', 'release', 'refund', 'payout')),
  amount NUMERIC(10,2) NOT NULL,
  yookassa_payment_id TEXT,
  yookassa_payout_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_order ON escrow_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_event ON escrow_ledger(event_type);
```

disputes:
```sql
CREATE TABLE IF NOT EXISTS disputes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  initiated_by TEXT NOT NULL,  -- phone or telegram_id of initiator
  initiator_role TEXT NOT NULL CHECK (initiator_role IN ('customer', 'supplier')),
  reason TEXT NOT NULL DEFAULT '',
  resolution TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'cancelled')),
  resolved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_disputes_order ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
```


## Next.js 15 App Router API Route Patterns

**Confidence: HIGH** - verified in existing codebase (pwa/src/app/api/orders/[id]/route.ts uses the exact pattern).

### Dynamic Params Pattern (Next.js 15 Breaking Change)

In Next.js 15, `params` is a Promise, must be awaited:

```typescript
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  // ...
}
```

The existing /api/orders/[id]/route.ts already uses this exact pattern. All new dynamic routes should match it.

### New Route Files Required

```
pwa/src/app/api/
  payments/
    create-escrow/route.ts       -- POST: create escrow payment
  orders/
    [id]/
      confirm/route.ts           -- POST: confirm by customer or supplier
      dispute/route.ts           -- POST: initiate dispute
  cron/
    capture-expired/route.ts     -- POST: called by pg_cron or GitHub Actions
  webhooks/
    yookassa/route.ts            -- POST: new dedicated webhook (or extend callback)

pwa/src/app/
  order/
    [id]/
      pay/page.tsx               -- Payment initiation UI
      status/page.tsx            -- Post-payment return URL UI
      confirm/page.tsx           -- Confirmation UI (both sides)
```

NOTE: Existing callback route is /api/payments/callback (not /api/webhooks/yookassa).
Decision: extend existing /api/payments/callback with new event cases,
OR create /api/webhooks/yookassa and register separate URL with YooKassa.
Context.md says to extend existing, so use /api/payments/callback.

### Existing Patterns to Reuse

- supabaseAdmin client: `getServiceClient()` from @/lib/supabase
- Auth: `getSession()` and `getViewerSession()` from @/lib/auth
- Error format: `NextResponse.json({ error: 'message' }, { status: NNN })`
- Always return 200 for webhook endpoints even on errors (YooKassa retries otherwise)


## Common Pitfalls

### Pitfall 1: Capturing After Hold Expiry

**What goes wrong:** If capture is attempted after 7 days, YooKassa returns a 4xx error. The payment status is already `canceled` by YooKassa.
**Why it happens:** Auto-cancel cron fires with incorrect timing (e.g., DST confusion), or cron fails silently.
**How to avoid:** Auto-capture at 6 days (not 7). Always check payment status via GET /payments/{id} before attempting capture. Handle the "payment already canceled" case gracefully.
**Warning signs:** YooKassa returns HTTP 422 with code `invalid_request` on capture attempt.

### Pitfall 2: pg_net Returns Immediately (Async)

**What goes wrong:** Developer assumes `net.http_post()` blocks and returns the HTTP response. Actually returns a bigint request_id.
**Why it happens:** pg_net is async by design to avoid blocking PostgreSQL connections.
**How to avoid:** Use PERFORM in void contexts. If you need the response, query `net._http_response` after a delay, or use the Next.js API route to log results.
**Warning signs:** The pg_cron job "succeeds" (returns OK) even when the HTTP call fails.

### Pitfall 3: Webhook Receives Events for Other Payments

**What goes wrong:** The webhook handler tries to find an escrow order by payment_id but the payment was for VIP or rental, not an order.
**Why it happens:** YooKassa sends all events from all shop payments to the same webhook URL.
**How to avoid:** Check `metadata.type === 'escrow'` before processing escrow-specific logic. Current code checks for `metadata.order_id` which is a good start.

### Pitfall 4: Double-Capture Race Condition

**What goes wrong:** Both pg_cron auto-capture and a manual admin capture fire simultaneously.
**Why it happens:** No idempotency guard at the DB level.
**How to avoid:** Add `payment_captured = false` check in the pg_cron query AND in the capture API route. Use `UPDATE orders SET payment_captured=true WHERE order_id=? AND payment_captured=false` (returns 0 rows if already captured). This atomic check prevents double-capture.

### Pitfall 5: Storing Raw Card Numbers

**What goes wrong:** Executor enters card number in a plain text input, PWA stores it in workers.payout_card as a full PAN.
**Why it happens:** PCI DSS requirement is overlooked.
**How to avoid:** NEVER store raw card numbers. Use YooKassa Payout Widget to get a card_synonym (safe token). Store only the synonym and card last-4 for display.

### Pitfall 6: YooKassa Returns String Amounts (not numbers)

**What goes wrong:** Code does math on `payment.amount.value` and gets NaN because it's a string like "1500.00".
**Why it happens:** YooKassa API returns amounts as strings in JSON.
**How to avoid:** Always `parseFloat(payment.amount.value)` before arithmetic. The existing callback route already does this correctly.

### Pitfall 7: Confirmation Token Reuse

**What goes wrong:** A confirmation link is used multiple times, allowing replay.
**Why it happens:** No one-time-use check.
**How to avoid:** After successful confirmation, check that `customer_confirmed` or `supplier_confirmed` is already true and return 409 if so. The DB field itself acts as the spent-token marker.


## Architecture Patterns

### Migration 006 File Structure

File: `supabase/migrations/006_escrow.sql`

Sections:
1. ALTER TABLE orders - add 14 new escrow columns with DEFAULT NULL / DEFAULT false
2. ALTER TABLE workers - add payout_card TEXT, is_selfemployed_verified BOOLEAN DEFAULT false
3. CREATE TABLE IF NOT EXISTS escrow_ledger
4. CREATE TABLE IF NOT EXISTS disputes
5. RLS: escrow_ledger and disputes = service_role only
6. Indexes on new columns
7. pg_cron job registration (requires pg_net extension)

### yukassa.ts Extension Pattern

Add to existing file (keep createPayment() unchanged per D-06):

```typescript
// New function signatures to add:

export interface EscrowPaymentParams {
  amount: number;
  subtotal: number;
  serviceFee: number;
  description: string;
  returnUrl: string;
  orderId: string;
  customerPhone: string;
  idempotenceKey: string;
}

export async function createEscrowPayment(params: EscrowPaymentParams): Promise<PaymentResult>
// Creates payment with capture:false, 2-line receipt

export async function capturePayment(paymentId: string, idempotenceKey: string): Promise<void>
// Full capture, no receipt needed (same amount as held)

export interface PayoutParams {
  amount: number;
  cardSynonym: string;
  orderId: string;
  workerPhone: string;
  idempotenceKey: string;
}

export async function createPayout(params: PayoutParams): Promise<{ id: string; status: string }>
// Uses YUKASSA_PAYOUT_AGENT_ID + YUKASSA_PAYOUT_SECRET
```

### Webhook Handler Extension

Extend existing `/api/payments/callback/route.ts`:

```typescript
// Existing:
if (body.event === 'payment.succeeded') { ... }

// Add:
if (body.event === 'payment.waiting_for_capture') {
  // Check metadata.type === 'escrow'
  // Update orders: escrow_status='payment_held', yookassa_payment_id, payment_held_at=now()
  // Insert into escrow_ledger: event_type='hold'
  // Trigger notification to customer (n8n webhook) with confirmation link
}
```

### Confirmation Flow State Machine

```
escrow_status transitions:
  '' (initial)
  -> payment_held     (webhook: payment.waiting_for_capture)
  -> in_progress      (admin or n8n: after order is accepted by supplier)
  -> pending_confirm  (work declared complete)
  -> completed        (both confirmed -> trigger capture + payout)
  -> disputed         (dispute filed)
  -> cancelled        (payment cancelled or expired)
```

customer_confirmed + supplier_confirmed both = true -> trigger capturePayment() + createPayout()


## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| JWT signing | Custom HMAC wrapper | Extend existing auth.ts signPodryadSession pattern | Already exists, tested, consistent key management |
| YooKassa API calls | Raw fetch() in each route | Extend yukassa.ts with new typed functions | Consistent auth, error handling, types |
| Cron scheduling | Custom node-cron or setInterval | Supabase pg_cron | Database-native, survives app restarts, no extra process |
| Card data collection | HTML form + DB storage | YooKassa Payout Widget | PCI DSS requirement - raw cards cannot be stored |
| Amount formatting | Manual toFixed() in each place | Standardize in yukassa.ts | YooKassa requires "1500.00" string format |
| IP CIDR matching | Custom bit-math library | Inline function (4 lines) | Trivial for IPv4, no dependency needed |


## Validation Architecture

**Framework:** Vitest 4.1.0 (already installed)
**Config file:** `pwa/vitest.config.ts` (exists, node environment, globals: true)
**Quick run:** `cd pwa && npm test` (runs vitest run)
**Full suite:** `cd pwa && npm test`
**E2E:** `cd pwa && npm run test:e2e` (Playwright, for UI flows)

### Test Files Required (Wave 0 Gaps)

All new - none currently exist for escrow logic:

| Test File | Covers | Type |
|---|---|---|
| `pwa/src/lib/__tests__/yukassa-escrow.test.ts` | createEscrowPayment params, capturePayment, createPayout input validation | unit |
| `pwa/src/lib/__tests__/escrow-confirm-token.test.ts` | signConfirmationToken, verifyConfirmationToken, expiry, wrong purpose | unit |
| `pwa/src/app/api/payments/__tests__/webhook.test.ts` | payment.waiting_for_capture handler logic, payment.succeeded coexistence | unit (mocked) |
| `pwa/src/app/api/orders/__tests__/confirm.test.ts` | valid token, expired token, wrong role, already confirmed | unit (mocked) |

### What to Test Per Component

**yukassa-escrow.test.ts:**
- createEscrowPayment: request has capture:false, receipt has 2 items summing to total
- capturePayment: correct endpoint /payments/{id}/capture, idempotence key present
- createPayout: uses PAYOUT_AGENT_ID not SHOP_ID, endpoint is payouts.yookassa.ru

**escrow-confirm-token.test.ts:**
- Generated token verifies correctly within 24h
- Expired token (exp in past) returns null
- Token with wrong purpose returns null
- Wrong orderId in token returns null on verify
- Token signed with wrong secret returns null

**webhook.test.ts:**
- payment.waiting_for_capture: updates escrow_status, sets payment_held_at, inserts ledger row
- payment.succeeded: existing behavior unchanged
- Unknown event: returns 200 without error
- Non-escrow payment (missing metadata.type): skips escrow logic

**confirm.test.ts:**
- Valid customer token: sets customer_confirmed=true
- Valid supplier token: sets supplier_confirmed=true  
- Already confirmed (idempotent): returns 200 without error
- Expired token: returns 401
- Wrong orderId: returns 401

### Manual-Only Tests

- YooKassa webhook IP filtering: requires real YooKassa IPs or sandbox environment
- pg_cron job execution: manual check in Supabase dashboard after migration
- Payout Widget card collection: requires YooKassa test environment with widget


## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Node.js | Next.js runtime | Yes | v24.13.0 | - |
| Vitest | Unit tests | Yes (in package.json) | 4.1.0 | - |
| Playwright | E2E tests | Yes (in package.json) | 1.58.2 | - |
| Supabase project | DB + pg_cron | External service | n/a | - |
| pg_cron | Auto-capture cron | Available in Supabase Pro | 1.6.4 | GitHub Actions scheduled workflow |
| pg_net | HTTP from cron | Available in Supabase | n/a | GitHub Actions |
| YooKassa Payouts API | Executor payouts | Requires SEPARATE agent contract | n/a | Manual payout until contract signed |
| YooKassa Payout Widget | Card synonym collection | Requires agent contract | n/a | Block payout flow until available |

**Missing dependencies with no immediate fallback:**
- YooKassa Payouts agent contract: Must be signed before payout functionality can be tested end-to-end. Planning must account for this gate. The payout code can be implemented and tested with mocks, but real execution requires the contract.

**Missing dependencies with fallback:**
- pg_cron: GitHub Actions fallback is defined in D-03.


## Open Questions

1. **YooKassa Payouts Agent Contract Status**
   - What we know: A separate contract is required to enable payouts API. Credentials differ from payments.
   - What is unclear: Has ИП Жбанков already signed a payouts contract? Is YUKASSA_PAYOUT_AGENT_ID known?
   - Recommendation: Create payout code with mock support. Add an env var check at startup: if YUKASSA_PAYOUT_AGENT_ID is missing, log a warning and skip payout step (funds stay captured, payout queued for manual release).

2. **Webhook URL Registration**
   - What we know: YooKassa webhooks must be registered in the shop settings dashboard (or via API).
   - What is unclear: Is the current /api/payments/callback registered in YooKassa settings? Does extending it with new events require re-registration?
   - Recommendation: Add payment.waiting_for_capture to the existing registered webhook URL. If a new URL is needed, register /api/webhooks/yookassa separately.

3. **pg_cron on Current Supabase Plan**
   - What we know: pg_cron requires Supabase Pro plan. Free plan does not include it.
   - What is unclear: What is the current Supabase plan for this project?
   - Recommendation: Implement both pg_cron and GitHub Actions approaches. The GitHub Actions fallback works on any plan.

4. **IP Verification in Vercel/Render Deployment**
   - What we know: x-forwarded-for header contains the real client IP when behind Vercel edge.
   - What is unclear: How many proxy hops does Vercel add? Is the FIRST value in x-forwarded-for the YooKassa IP?
   - Recommendation: In development/staging, skip IP verification via NODE_ENV check. In production, log the IP header values from YooKassa callbacks before enabling hard enforcement.

5. **order_items Table**
   - What we know: ROADMAP.md scope mentions adding order_items table.
   - What is unclear: CONTEXT.md (locked decisions) does NOT mention order_items. Only escrow_ledger and disputes are in D-05.
   - Recommendation: Skip order_items in Phase 1. CONTEXT.md decisions take precedence over ROADMAP.md scope descriptions.


## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---|---|---|---|
| next | 15.1.0 | App Router, API routes, pages | Existing stack |
| @supabase/supabase-js | 2.99.3 | DB client (service_role) | Existing stack |
| typescript | 5.9.3 | Type safety | Existing stack |
| vitest | 4.1.0 | Unit tests | Existing stack |

### New Environment Variables Required

```bash
# Add to .env.example and production env:
YUKASSA_PAYOUT_AGENT_ID=           # From YooKassa Payouts settings (separate from SHOP_ID)
YUKASSA_PAYOUT_SECRET=             # From YooKassa Integration > API keys (payouts)
CRON_SECRET=                       # Random secret for /api/cron/* route auth
NEXT_PUBLIC_SITE_URL=              # Already may exist - needed for pg_net callback URL
```

Existing (already in .env.example):
```bash
YUKASSA_SHOP_ID=                   # Existing payments
YUKASSA_SECRET_KEY=                # Existing payments
SESSION_SECRET=                    # Existing JWT signing
```

### No New npm Packages Required

All functionality is achievable with existing dependencies:
- JWT: crypto (built-in Node.js) via existing auth.ts
- HTTP to YooKassa: fetch (built-in Next.js)
- DB: @supabase/supabase-js (existing)
- CIDR check: 4-line inline function (no library needed for 7 known IPs)

## Sources

### Primary (HIGH confidence)
- Official YooKassa webhook documentation - payment.waiting_for_capture event format and IP ranges
- Official YooKassa capture API docs - /payments/{id}/capture endpoint
- Supabase pg_cron docs - schedule syntax, UTC timezone
- Supabase pg_net docs - net.http_post() signature
- Existing pwa/src/lib/auth.ts - JWT patterns (read directly)
- Existing pwa/src/lib/yukassa.ts - API call patterns (read directly)
- Existing pwa/src/app/api/orders/[id]/route.ts - Next.js 15 params pattern (read directly)
- Existing supabase/schema.sql - current DB schema (read directly)

### Secondary (MEDIUM confidence)
- nestjs-yookassa.ru/docs/webhooks/security - YooKassa IP ranges (cross-referenced with SDK issues)
- github.com/yoomoney/yookassa-sdk-php issue #26 - IP verification approach
- Supabase GitHub discussions - pg_cron timezone UTC behavior

### Tertiary (LOW confidence - needs validation)
- YooKassa Payouts API contract requirements - confirmed conceptually but specific UI/process not verified
- pg_cron availability on specific Supabase plan - depends on project subscription tier

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH - all existing, versions confirmed in package.json
- YooKassa 2-stage payment: HIGH - API patterns well documented, confirmed in multiple SDK examples
- YooKassa Payouts: MEDIUM - endpoint confirmed, but PCI DSS/widget flow needs real integration testing
- pg_cron + pg_net: HIGH - official Supabase docs clear and confirmed
- Webhook IP verification: MEDIUM-HIGH - IPs from third-party source (matches official docs pattern)
- JWT confirmation tokens: HIGH - directly extends existing auth.ts which is tested
- PostgreSQL migrations: HIGH - IF NOT EXISTS pattern confirmed as standard Supabase approach

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (YooKassa API stable; pg_cron version 1.6.4 current on Supabase)

