-- =============================================================
-- Подряд PRO — Миграция 017: Ручная платёжка (убираем YooKassa)
-- =============================================================
-- Non-breaking: все новые колонки DEFAULT NULL / DEFAULT значения

-- ── 1. workers/contractors: реквизиты для выплаты ──

ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'sbp'
    CHECK (payout_type IN ('sbp', 'bank_transfer', 'cash')),
  ADD COLUMN IF NOT EXISTS payout_sbp_phone TEXT,           -- номер SBP (может совпадать с телефоном)
  ADD COLUMN IF NOT EXISTS payout_bank_details TEXT,        -- свободный текст: банк, счёт, БИК, ИНН
  ADD COLUMN IF NOT EXISTS inn TEXT,                        -- ИНН (для самозанятых и ИП)
  ADD COLUMN IF NOT EXISTS is_legal_entity BOOLEAN DEFAULT false;  -- ИП или ООО

-- ── 2. contractors (если отдельная таблица) ──

ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'sbp'
    CHECK (payout_type IN ('sbp', 'bank_transfer', 'cash')),
  ADD COLUMN IF NOT EXISTS payout_sbp_phone TEXT,
  ADD COLUMN IF NOT EXISTS payout_bank_details TEXT,
  ADD COLUMN IF NOT EXISTS inn TEXT,
  ADD COLUMN IF NOT EXISTS is_legal_entity BOOLEAN DEFAULT false;

-- ── 3. orders: ручное управление платежом ──

-- Тип клиента: физлицо (СБП) или юрлицо (счёт)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'individual'
    CHECK (customer_type IN ('individual', 'legal_entity')),

  -- Статус оплаты (вместо escrow)
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'invoice_sent', 'paid', 'overdue')),

  ADD COLUMN IF NOT EXISTS payment_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_paid_at TIMESTAMPTZ,

  -- Выплата исполнителю (ручная)
  ADD COLUMN IF NOT EXISTS executor_payout_status TEXT DEFAULT 'pending'
    CHECK (executor_payout_status IN ('pending', 'paid')),
  ADD COLUMN IF NOT EXISTS executor_payout_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS executor_payout_note TEXT,

  -- Реквизиты для конкретного счёта (заполняет admin при выставлении)
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC(12,2);

-- ── 4. Изменить payout_method — убираем yookassa_payout ──
-- Сначала удаляем старый constraint, ставим новый

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payout_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payout_method_check
  CHECK (payout_method IS NULL OR payout_method IN ('sbp', 'bank_transfer', 'cash'));

-- Обновляем существующие записи с yookassa_payout → sbp
UPDATE orders SET payout_method = 'sbp' WHERE payout_method = 'yookassa_payout';
UPDATE orders SET payout_method = 'manual_transfer' WHERE payout_method NOT IN ('sbp', 'bank_transfer', 'cash') AND payout_method IS NOT NULL;

-- ── 5. Индексы ──

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_type ON orders(customer_type);
CREATE INDEX IF NOT EXISTS idx_orders_executor_payout ON orders(executor_payout_status);
