-- =============================================================
-- Подряд PRO — Применить СРАЗУ обе миграции: 017 + 018
-- Вставьте весь файл в Supabase SQL Editor и нажмите Run
-- https://supabase.com/dashboard/project/rnqalafmuyrlfioqdore/sql/new
-- =============================================================

-- ════════════════════════════════════
-- МИГРАЦИЯ 017: Ручная платёжная система
-- ════════════════════════════════════

-- workers: реквизиты для выплаты исполнителям
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'sbp'
    CHECK (payout_type IN ('sbp', 'bank_transfer', 'cash')),
  ADD COLUMN IF NOT EXISTS payout_sbp_phone TEXT,
  ADD COLUMN IF NOT EXISTS payout_bank_details TEXT,
  ADD COLUMN IF NOT EXISTS inn TEXT,
  ADD COLUMN IF NOT EXISTS is_legal_entity BOOLEAN DEFAULT false;

-- contractors: те же реквизиты
ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'sbp'
    CHECK (payout_type IN ('sbp', 'bank_transfer', 'cash')),
  ADD COLUMN IF NOT EXISTS payout_sbp_phone TEXT,
  ADD COLUMN IF NOT EXISTS payout_bank_details TEXT,
  ADD COLUMN IF NOT EXISTS inn TEXT,
  ADD COLUMN IF NOT EXISTS is_legal_entity BOOLEAN DEFAULT false;

-- orders: ручное управление платежом вместо escrow
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'individual'
    CHECK (customer_type IN ('individual', 'legal_entity')),
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'invoice_sent', 'paid', 'overdue')),
  ADD COLUMN IF NOT EXISTS payment_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS executor_payout_status TEXT DEFAULT 'pending'
    CHECK (executor_payout_status IN ('pending', 'paid')),
  ADD COLUMN IF NOT EXISTS executor_payout_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS executor_payout_note TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC(12,2);

-- Обновить constraint payout_method (убрать yookassa_payout)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payout_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payout_method_check
  CHECK (payout_method IS NULL OR payout_method IN ('sbp', 'bank_transfer', 'cash'));

-- Перенести старые значения
UPDATE orders SET payout_method = 'sbp' WHERE payout_method = 'yookassa_payout';
UPDATE orders SET payout_method = NULL WHERE payout_method NOT IN ('sbp', 'bank_transfer', 'cash') AND payout_method IS NOT NULL;

-- ════════════════════════════════════
-- МИГРАЦИЯ 018: Удаление YooKassa/Escrow артефактов
-- ════════════════════════════════════

-- Отключить cron-задачу (если есть)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-capture-escrow-holds') THEN
    PERFORM cron.unschedule('auto-capture-escrow-holds');
  END IF;
EXCEPTION WHEN undefined_schema THEN NULL;
END $$;

-- Удалить таблицу escrow_ledger
DROP TABLE IF EXISTS escrow_ledger;

-- Удалить мёртвые колонки из orders
ALTER TABLE orders DROP COLUMN IF EXISTS subtotal;
ALTER TABLE orders DROP COLUMN IF EXISTS service_fee_rate;
ALTER TABLE orders DROP COLUMN IF EXISTS service_fee;
ALTER TABLE orders DROP COLUMN IF EXISTS combo_discount;
ALTER TABLE orders DROP COLUMN IF EXISTS total;
ALTER TABLE orders DROP COLUMN IF EXISTS payout_amount;
ALTER TABLE orders DROP COLUMN IF EXISTS escrow_status;
ALTER TABLE orders DROP COLUMN IF EXISTS yookassa_payment_id;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_captured;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_held_at;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_captured_at;
ALTER TABLE orders DROP COLUMN IF EXISTS payout_status_escrow;
ALTER TABLE orders DROP COLUMN IF EXISTS payout_id;
ALTER TABLE orders DROP COLUMN IF EXISTS customer_email;

-- Удалить мёртвые колонки из workers
ALTER TABLE workers DROP COLUMN IF EXISTS payout_card;
ALTER TABLE workers DROP COLUMN IF EXISTS payout_card_synonym;
ALTER TABLE workers DROP COLUMN IF EXISTS is_selfemployed_verified;

-- Удалить yukassa_id из payments и rentals
ALTER TABLE payments DROP COLUMN IF EXISTS yukassa_id;
ALTER TABLE rentals  DROP COLUMN IF EXISTS yukassa_id;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_orders_payment_status  ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_type   ON orders(customer_type);
CREATE INDEX IF NOT EXISTS idx_orders_executor_payout ON orders(executor_payout_status);

-- ════════════════════════════════════
-- ПРОВЕРКА — после выполнения убедитесь что запрос возвращает данные без ошибок
-- ════════════════════════════════════
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN (
    'payment_status', 'customer_type', 'executor_payout_status',
    'invoice_number', 'invoice_amount', 'payment_sent_at'
  )
ORDER BY column_name;
