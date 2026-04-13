-- =============================================================
-- Подряд PRO — Миграция 018: Удаление YooKassa/Escrow артефактов
-- =============================================================
-- YooKassa полностью удалена из приложения (апрель 2026).
-- Теперь используется ручная оркестрация платежей:
--   - customer: payment_status / payment_type (SBP или счёт)
--   - executor: executor_payout_status + реквизиты в contractors/workers
-- Эта миграция удаляет все мёртвые таблицы и колонки.
-- Non-destructive для живых данных: все удаляемые поля были NULL или '' в новых записях.

-- ── 1. Отключить cron-задачу авто-захвата escrow ──
SELECT cron.unschedule('auto-capture-escrow-holds')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-capture-escrow-holds');

-- ── 2. DROP TABLE escrow_ledger ──
-- Чистый лог транзакций YooKassa. Больше не используется.
DROP TABLE IF EXISTS escrow_ledger;

-- ── 3. DROP COLUMNS из orders — мёртвые escrow/YooKassa поля ──

-- Escrow pricing (заменены на display_price / customer_total / supplier_payout / platform_margin из мигр. 008)
ALTER TABLE orders DROP COLUMN IF EXISTS subtotal;
ALTER TABLE orders DROP COLUMN IF EXISTS service_fee_rate;
ALTER TABLE orders DROP COLUMN IF EXISTS service_fee;
ALTER TABLE orders DROP COLUMN IF EXISTS combo_discount;
ALTER TABLE orders DROP COLUMN IF EXISTS total;
ALTER TABLE orders DROP COLUMN IF EXISTS payout_amount;

-- YooKassa-специфичные поля
ALTER TABLE orders DROP COLUMN IF EXISTS escrow_status;
ALTER TABLE orders DROP COLUMN IF EXISTS yookassa_payment_id;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_captured;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_held_at;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_captured_at;
ALTER TABLE orders DROP COLUMN IF EXISTS payout_status_escrow;
ALTER TABLE orders DROP COLUMN IF EXISTS payout_id;

-- Email для чеков YooKassa (никогда не заполнялся в новых заявках)
ALTER TABLE orders DROP COLUMN IF EXISTS customer_email;

-- ── 4. DROP COLUMNS из workers — мёртвые payout поля YooKassa ──
-- Заменены на payout_type / payout_sbp_phone / payout_bank_details (мигр. 017)
ALTER TABLE workers DROP COLUMN IF EXISTS payout_card;
ALTER TABLE workers DROP COLUMN IF EXISTS payout_card_synonym;
ALTER TABLE workers DROP COLUMN IF EXISTS is_selfemployed_verified;

-- ── 5. DROP COLUMNS из payments и rentals — yukassa_id ──
ALTER TABLE payments DROP COLUMN IF EXISTS yukassa_id;
ALTER TABLE rentals  DROP COLUMN IF EXISTS yukassa_id;

-- ── 6. Убедиться, что новые индексы из мигр. 017 не дублируются ──
-- (Создаются заново только если отсутствуют — безопасно)
CREATE INDEX IF NOT EXISTS idx_orders_payment_status   ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_type    ON orders(customer_type);
CREATE INDEX IF NOT EXISTS idx_orders_executor_payout  ON orders(executor_payout_status);

-- ── Конец миграции ──
