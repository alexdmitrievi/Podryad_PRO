-- Migration 011: contractors, customer_tokens, orders columns
-- Platform upgrade: customer orders + contractor registration + admin CRM

-- 1. contractors table
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'omsk',
  specialties TEXT[] NOT NULL DEFAULT '{}',
  experience TEXT,
  preferred_contact TEXT NOT NULL DEFAULT 'phone',
  about TEXT,
  source TEXT NOT NULL DEFAULT 'pwa',
  telegram_id TEXT,
  max_id TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contractors_status ON contractors (status);
CREATE INDEX IF NOT EXISTS idx_contractors_phone ON contractors (phone);
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

-- 2. customer_tokens table
CREATE TABLE IF NOT EXISTS customer_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  preferred_contact TEXT NOT NULL DEFAULT 'phone',
  messenger_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_tokens_token ON customer_tokens (access_token);
ALTER TABLE customer_tokens ENABLE ROW LEVEL SECURITY;

-- 3. orders table — new columns
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
ALTER TABLE orders ADD COLUMN IF NOT EXISTS display_price NUMERIC;

CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_contractor_id ON orders (contractor_id);
