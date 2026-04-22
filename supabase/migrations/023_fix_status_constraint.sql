-- Migration 023: Add 'confirming' and 'disputed' to orders.status CHECK
-- 2026-04-22
--
-- Bug: /api/orders/[id]/confirm  sets status = 'confirming'
--      /api/orders/[id]/dispute  sets status = 'disputed'
-- Both values are absent from migration 020's CHECK list → DB raises
-- 23514 check_violation → 500 responses on those endpoints.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',       -- лид принят, ещё не оценён
    'priced',        -- оценён, ждём оплаты
    'payment_sent',  -- ссылка/счёт отправлены клиенту
    'paid',          -- оплата получена
    'in_progress',   -- работы идут
    'confirming',    -- обе стороны подтвердили, ожидает выплаты (добавлен в 023)
    'done',          -- работы завершены
    'completed',     -- финализирован после выплаты
    'disputed',      -- открыт спор (добавлен в 023)
    'published',     -- опубликован в ленте/маркетплейсе
    'closed',        -- архивный
    'cancelled'      -- отменён
  ));
