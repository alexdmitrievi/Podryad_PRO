---
phase: quick
plan: 260402-mtc
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/010_payout_method.sql
  - pwa/src/lib/types.ts
  - pwa/src/lib/db.ts
  - pwa/src/app/api/orders/[id]/confirm/route.ts
autonomous: true
requirements: ["PAYOUT-FLEX"]
must_haves:
  truths:
    - "payout_method column exists on orders table with CHECK constraint for 3 values"
    - "yookassa_payout orders trigger existing createPayout logic unchanged"
    - "manual_transfer and cash orders fire n8n webhook and set payout_status_escrow to pending_manual"
    - "Order type and db mapper include payout_method field"
  artifacts:
    - path: "supabase/migrations/010_payout_method.sql"
      provides: "ALTER TABLE adding payout_method column"
      contains: "payout_method"
    - path: "pwa/src/lib/types.ts"
      provides: "PayoutStatusEscrow with pending_manual, Order with payout_method"
      contains: "pending_manual"
    - path: "pwa/src/app/api/orders/[id]/confirm/route.ts"
      provides: "Branched payout logic based on payout_method"
      contains: "manual_transfer"
  key_links:
    - from: "pwa/src/app/api/orders/[id]/confirm/route.ts"
      to: "N8N_PAYOUT_WEBHOOK_URL"
      via: "fire-and-forget fetch POST"
      pattern: "N8N_PAYOUT_WEBHOOK_URL"
---

<objective>
Add flexible payout methods to orders. Customer payment flow (YooKassa escrow) stays unchanged.
After both-party confirmation and capture, payout routing branches on `orders.payout_method`:
- `yookassa_payout` -- existing auto-payout via YooKassa API (no changes)
- `manual_transfer` -- fire n8n webhook for manual bank transfer reminder
- `cash` -- fire n8n webhook for cash handoff reminder

Default is `manual_transfer`. Method is set directly in Supabase Studio at order creation (no UI).

Purpose: Enable MVP-stage flexibility where not all workers have YooKassa payout cards.
Output: Migration, updated types, updated confirm route with branched payout logic.
</objective>

<execution_context>
@.planning/STATE.md
</execution_context>

<context>
@pwa/src/app/api/orders/[id]/confirm/route.ts
@pwa/src/lib/types.ts
@pwa/src/lib/db.ts
@supabase/migrations/009_leads.sql

<interfaces>
From pwa/src/lib/types.ts:
```typescript
export type PayoutStatusEscrow = 'pending' | 'processing' | 'succeeded' | 'failed';

export interface Order {
  // ... existing fields ...
  payout_status_escrow?: PayoutStatusEscrow;
  payout_id?: string;
  customer_total?: number;
  supplier_payout?: number;
  // payout_method NOT YET present -- Task 1 adds it
}
```

From pwa/src/lib/db.ts:
```typescript
export function orderFromDb(row: Record<string, unknown>): Order { ... }
export async function getOrderById(orderId: string): Promise<Record<string, unknown> | null> { ... }
export async function updateOrder(orderId: string, updates: Record<string, unknown>): Promise<void> { ... }
export async function insertEscrowLedger(entry: { order_id: string; type: string; amount: number; yookassa_operation_id?: string; note?: string; }): Promise<void> { ... }
export async function getWorkerByTelegramId(telegramId: string): Promise<Record<string, unknown> | null> { ... }
export async function getWorkerByPhone(phone: string): Promise<Record<string, unknown> | null> { ... }
```

From pwa/src/app/api/orders/[id]/confirm/route.ts (lines 117-161 -- current payout block):
```typescript
// Payout to executor (if payout credentials are configured)
const payoutAgentId = process.env.YUKASSA_PAYOUT_AGENT_ID;
if (payoutAgentId && updated.executor_id) {
  try {
    const worker =
      (await getWorkerByTelegramId(String(updated.executor_id))) ||
      (await getWorkerByPhone(String(updated.executor_id)));
    if (worker?.payout_card_synonym) {
      const payoutResult = await createPayout({ ... });
      await updateOrder(id, { payout_status_escrow: 'processing', payout_id: payoutResult.id });
      await insertEscrowLedger({ ... });
    } else {
      console.warn(`No payout card synonym...`);
      await updateOrder(id, { payout_status_escrow: 'pending' });
    }
  } catch (err) {
    console.error(`Payout failed...`);
    await updateOrder(id, { payout_status_escrow: 'failed' });
  }
} else if (!payoutAgentId) {
  console.warn('YUKASSA_PAYOUT_AGENT_ID not configured, payout deferred');
  await updateOrder(id, { payout_status_escrow: 'pending' });
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Migration + types + db mapper for payout_method</name>
  <files>supabase/migrations/010_payout_method.sql, pwa/src/lib/types.ts, pwa/src/lib/db.ts</files>
  <action>
**1. Create `supabase/migrations/010_payout_method.sql`:**
```sql
-- Migration 010: payout_method column for flexible executor payouts
-- 2026-04-02

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_method TEXT
  DEFAULT 'manual_transfer'
  CHECK (payout_method IN ('yookassa_payout', 'manual_transfer', 'cash'));
```
No RLS changes needed -- orders table already has policies.

**2. Update `pwa/src/lib/types.ts`:**
- Add `'pending_manual'` to the `PayoutStatusEscrow` union type:
  ```typescript
  export type PayoutStatusEscrow = 'pending' | 'processing' | 'succeeded' | 'failed' | 'pending_manual';
  ```
- Add `payout_method` field to the `Order` interface, after the `payout_id` field:
  ```typescript
  payout_method?: string;
  ```

**3. Update `pwa/src/lib/db.ts` -- `orderFromDb` function:**
Add mapping for the new field inside `orderFromDb`, after the `payout_id` line (around line 53):
```typescript
payout_method: row.payout_method != null ? String(row.payout_method) : undefined,
```
  </action>
  <verify>
    <automated>cd /c/Users/HP/Desktop/Подряд_PRO && cat supabase/migrations/010_payout_method.sql && grep -n "pending_manual" pwa/src/lib/types.ts && grep -n "payout_method" pwa/src/lib/db.ts pwa/src/lib/types.ts</automated>
  </verify>
  <done>Migration file exists with correct ALTER TABLE + CHECK. PayoutStatusEscrow includes 'pending_manual'. Order interface has payout_method field. orderFromDb maps payout_method from row.</done>
</task>

<task type="auto">
  <name>Task 2: Branch payout logic in confirm route by payout_method</name>
  <files>pwa/src/app/api/orders/[id]/confirm/route.ts</files>
  <action>
In `pwa/src/app/api/orders/[id]/confirm/route.ts`, replace the entire payout block (lines 117-161, from the `// Payout to executor` comment to the closing brace of `} else if (!payoutAgentId)`) with branched logic based on `payout_method`.

**CRITICAL: The yookassa_payout branch must contain the EXACT existing payout code (lines 118-161) with zero modifications.**

Replace lines 117-161 with:

```typescript
      // Payout routing based on payout_method
      const payoutMethod = (updated.payout_method as string) || 'manual_transfer';

      if (payoutMethod === 'yookassa_payout') {
        // ---- YooKassa auto-payout (existing logic, unchanged) ----
        const payoutAgentId = process.env.YUKASSA_PAYOUT_AGENT_ID;
        if (payoutAgentId && updated.executor_id) {
          try {
            const worker =
              (await getWorkerByTelegramId(String(updated.executor_id))) ||
              (await getWorkerByPhone(String(updated.executor_id)));

            if (worker?.payout_card_synonym) {
              const payoutResult = await createPayout({
                amount: Number(updated.supplier_payout) || 0,
                cardSynonym: String(worker.payout_card_synonym),
                orderId: id,
                workerPhone: String(worker.phone || ''),
                description: `Выплата за заказ ${id}`,
                idempotenceKey: `payout-${id}-${Date.now()}`,
              });

              await updateOrder(id, {
                payout_status_escrow: 'processing',
                payout_id: payoutResult.id,
              });

              await insertEscrowLedger({
                order_id: id,
                type: 'payout',
                amount: Number(updated.supplier_payout) || 0,
                yookassa_operation_id: payoutResult.id,
                note: 'Payout initiated to executor',
              });
            } else {
              console.warn(
                `No payout card synonym for executor ${String(updated.executor_id)}, payout deferred`
              );
              await updateOrder(id, { payout_status_escrow: 'pending' });
            }
          } catch (err) {
            console.error(`Payout failed for order ${id}:`, err);
            await updateOrder(id, { payout_status_escrow: 'failed' });
          }
        } else if (!payoutAgentId) {
          console.warn('YUKASSA_PAYOUT_AGENT_ID not configured, payout deferred');
          await updateOrder(id, { payout_status_escrow: 'pending' });
        }
      } else {
        // ---- manual_transfer or cash: n8n webhook + pending_manual ----
        const methodLabel = payoutMethod === 'cash' ? 'Наличные' : 'Перевод вручную';
        const worker =
          (await getWorkerByTelegramId(String(updated.executor_id || ''))) ||
          (await getWorkerByPhone(String(updated.executor_id || '')));

        // Fire-and-forget n8n webhook for MAX notification
        const webhookUrl = process.env.N8N_PAYOUT_WEBHOOK_URL;
        if (webhookUrl) {
          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: id,
              payout_method: payoutMethod,
              payout_amount: updated.supplier_payout,
              worker_name: worker?.name || 'Неизвестно',
              worker_phone: worker?.phone || 'Неизвестно',
              method_label: methodLabel,
            }),
          }).catch((err) => console.error('n8n payout webhook failed:', err));
        }

        await updateOrder(id, { payout_status_escrow: 'pending_manual' });
        await insertEscrowLedger({
          order_id: id,
          type: 'payout',
          amount: Number(updated.supplier_payout) || 0,
          note: `Manual payout scheduled: ${payoutMethod}`,
        });
      }
```

**Env var:** `N8N_PAYOUT_WEBHOOK_URL` -- add to `.env.local` (if it exists) with an empty placeholder. If no .env files exist, note in commit message that the env var must be set.

No imports need changing -- `getWorkerByTelegramId`, `getWorkerByPhone`, `createPayout`, `updateOrder`, `insertEscrowLedger` are all already imported.
  </action>
  <verify>
    <automated>cd /c/Users/HP/Desktop/Подряд_PRO && grep -n "payoutMethod" pwa/src/app/api/orders/\[id\]/confirm/route.ts && grep -n "N8N_PAYOUT_WEBHOOK_URL" pwa/src/app/api/orders/\[id\]/confirm/route.ts && grep -c "createPayout" pwa/src/app/api/orders/\[id\]/confirm/route.ts && npx --prefix pwa tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>confirm/route.ts branches on payout_method: yookassa_payout uses original createPayout logic exactly; manual_transfer/cash sends n8n webhook + sets payout_status_escrow='pending_manual' + ledger entry. TypeScript compiles without errors. createPayout is called exactly once (inside yookassa_payout branch only).</done>
</task>

</tasks>

<verification>
1. `supabase/migrations/010_payout_method.sql` exists with ALTER TABLE + CHECK constraint for 3 values
2. `PayoutStatusEscrow` type includes `'pending_manual'`
3. `Order` interface includes `payout_method?: string`
4. `orderFromDb` maps `payout_method` from DB row
5. confirm route branches on `payoutMethod`: yookassa_payout vs manual/cash
6. yookassa_payout branch is byte-identical to original logic (same createPayout call, same error handling)
7. manual/cash branch fires n8n webhook (fire-and-forget) and sets `payout_status_escrow: 'pending_manual'`
8. TypeScript compiles cleanly: `npx --prefix pwa tsc --noEmit`
</verification>

<success_criteria>
- Migration 010 ready to apply in Supabase
- confirm route handles all 3 payout methods correctly
- No UI changes
- TypeScript compiles without errors
- N8N_PAYOUT_WEBHOOK_URL documented for runtime config
</success_criteria>

<output>
After completion, create `.planning/quick/260402-mtc-payout-method-orders-confirm-route-ts-ma/260402-mtc-SUMMARY.md`
</output>
