-- 016_customers.sql
-- Customer accounts with password auth

CREATE TABLE IF NOT EXISTS customers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone             TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  password_hash     TEXT NOT NULL,
  customer_type     TEXT NOT NULL DEFAULT 'personal', -- 'personal' | 'business'
  org_name          TEXT,
  inn               TEXT,
  city              TEXT,
  preferred_contact TEXT DEFAULT 'MAX',
  admin_notes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Link orders to customer accounts (optional, matched by phone if null)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_account_id UUID REFERENCES customers(id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone);
CREATE INDEX IF NOT EXISTS orders_customer_account_idx ON orders(customer_account_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_customers_updated_at();
