-- Migration 020: Align orders.status CHECK constraint with code
-- 2026-04-19
--
-- Bug: The application code writes statuses that the DB constraint rejects.
-- - pwa/src/lib/db.ts:330           → .update({ status: 'in_progress', ... })
-- - pwa/src/app/api/admin/orders/[id]/send-link/route.ts:59
--                                    → .update({ status: 'payment_sent' })
-- - pwa/src/app/admin/page.tsx:561 → optimistic 'priced'
-- - pwa/src/lib/db.ts:205           → .in('status', ['completed', 'closed'])
--
-- The original constraint (schema.sql:84-85) only allowed:
--   pending, paid, published, closed, cancelled, done
--
-- These inserts/updates raise 23514 check_violation and the endpoint 500s.
-- This migration expands the CHECK to the full lifecycle actually used in code.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',       -- lead принят, ещё не оценён
    'priced',        -- админ оценил, ждём оплаты
    'payment_sent',  -- ссылка на оплату отправлена заказчику
    'paid',          -- оплата получена / эскроу удержан
    'in_progress',   -- исполнитель принял, работы идут
    'done',          -- работы завершены, обе стороны подтвердили
    'completed',     -- финализированный статус после capture/выплаты
    'published',     -- опубликован в ленте/маркетплейсе
    'closed',        -- архивный
    'cancelled'      -- отменён
  ));
