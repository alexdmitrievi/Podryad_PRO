-- =============================================================
-- Подряд PRO — Миграция 008: Markup model + Order enhancements
-- =============================================================
-- Выполнить в Supabase SQL Editor.

-- ── 1. MARKUP RATES TABLE ──

CREATE TABLE IF NOT EXISTS markup_rates (
  id            SERIAL PRIMARY KEY,
  listing_type  TEXT NOT NULL CHECK (listing_type IN ('labor', 'material', 'equipment_rental')),
  category      TEXT,
  subcategory   TEXT,
  markup_percent DECIMAL(5,2) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Seed default markup rates (per monetization decision)
INSERT INTO markup_rates (listing_type, category, subcategory, markup_percent) VALUES
  ('labor',            NULL,       NULL,        15.00),
  ('labor',            'crew',     NULL,        18.00),
  ('material',         NULL,       NULL,         7.00),
  ('material',         'beton',    NULL,         5.00),
  ('equipment_rental', NULL,       NULL,        12.00),
  ('equipment_rental', 'tyazhelaya', NULL,      10.00)
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS idx_markup_rates_unique
  ON markup_rates(listing_type, COALESCE(category, ''), COALESCE(subcategory, ''));

-- ── 2. ADD MARKUP / ORDER NUMBER FIELDS TO orders ──

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_total  NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS supplier_payout NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS platform_margin NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS order_number    TEXT,
  ADD COLUMN IF NOT EXISTS supplier_id     UUID REFERENCES suppliers(id),
  ADD COLUMN IF NOT EXISTS order_items     JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS scheduled_date  TEXT,
  ADD COLUMN IF NOT EXISTS customer_name   TEXT;

-- ── 3. AUTO-GENERATE order_number ──

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1000;

CREATE OR REPLACE FUNCTION assign_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'ПРО-' || LPAD(nextval('order_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_number ON orders;
CREATE TRIGGER trg_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION assign_order_number();

-- ── 4. INDICES ──

CREATE INDEX IF NOT EXISTS idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
