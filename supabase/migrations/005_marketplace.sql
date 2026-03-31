-- =============================================================
-- Подряд PRO — Миграция 005: Маркетплейс материалов и спецтехники
-- =============================================================
-- Выполнить в Supabase SQL Editor.

-- ── 1. ОБНОВИТЬ РОЛИ ПОЛЬЗОВАТЕЛЕЙ ──

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('customer', 'worker', 'supplier'));

-- ── 2. ПРОФИЛИ ПОСТАВЩИКОВ ──

CREATE TABLE IF NOT EXISTS suppliers (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_phone       TEXT REFERENCES users(phone) ON DELETE CASCADE,
  company_name     TEXT NOT NULL,
  contact_name     TEXT NOT NULL,
  description      TEXT,
  city             TEXT NOT NULL DEFAULT 'Омск',
  delivery_available BOOLEAN DEFAULT true,
  is_verified      BOOLEAN DEFAULT false,
  is_active        BOOLEAN DEFAULT true,
  views_count      INTEGER DEFAULT 0,
  contacts_count   INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_city ON suppliers(city);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_phone ON suppliers(user_phone);

-- ── 3. КАТЕГОРИИ ──

CREATE TABLE IF NOT EXISTS marketplace_categories (
  id         SERIAL PRIMARY KEY,
  slug       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('material', 'heavy_equipment')),
  unit       TEXT NOT NULL,
  icon       TEXT DEFAULT '📦',
  sort_order INTEGER DEFAULT 0
);

INSERT INTO marketplace_categories (slug, name, type, unit, icon, sort_order) VALUES
  ('concrete',       'Бетон',               'material',        'м³',    '🏗', 1),
  ('gravel',         'Щебень',              'material',        'тонна', '🪨', 2),
  ('sand',           'Песок',               'material',        'тонна', '⏳', 3),
  ('bitumen',        'Битум',               'material',        'тонна', '🛢', 4),
  ('heating-fuel',   'Печное топливо',      'material',        'тонна', '🔥', 5),
  ('excavator',      'Экскаватор',          'heavy_equipment', 'час',   '🏗', 10),
  ('bulldozer',      'Бульдозер',           'heavy_equipment', 'час',   '🚜', 11),
  ('dump-truck',     'Самосвал',            'heavy_equipment', 'час',   '🚛', 12),
  ('crane',          'Автокран',            'heavy_equipment', 'час',   '🏗', 13),
  ('loader',         'Погрузчик',           'heavy_equipment', 'час',   '🚜', 14),
  ('concrete-mixer', 'Автобетоносмеситель', 'heavy_equipment', 'рейс',  '🔄', 15),
  ('flatbed',        'Трал / негабарит',    'heavy_equipment', 'рейс',  '🚚', 16)
ON CONFLICT (slug) DO NOTHING;

-- ── 4. ПРЕДЛОЖЕНИЯ ──

CREATE TABLE IF NOT EXISTS listings (
  id                SERIAL PRIMARY KEY,
  listing_id        TEXT UNIQUE NOT NULL,
  supplier_id       UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  category_slug     TEXT REFERENCES marketplace_categories(slug),
  title             TEXT NOT NULL,
  description       TEXT,
  specs             TEXT,
  price             DECIMAL(12,2) NOT NULL,
  price_unit        TEXT NOT NULL,
  min_order         TEXT,
  delivery_included BOOLEAN DEFAULT false,
  delivery_price    DECIMAL(10,2),
  delivery_note     TEXT,
  city              TEXT NOT NULL DEFAULT 'Омск',
  is_active         BOOLEAN DEFAULT true,
  views_count       INTEGER DEFAULT 0,
  contacts_count    INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_slug);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(is_active);

-- ── 5. ЗАПРОСЫ КОНТАКТОВ ──

CREATE TABLE IF NOT EXISTS contact_requests (
  id              SERIAL PRIMARY KEY,
  listing_id      INTEGER REFERENCES listings(id),
  requester_phone TEXT NOT NULL,
  requester_name  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 6. RLS ──

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read categories" ON marketplace_categories;
DROP POLICY IF EXISTS "Public read active listings" ON listings;
DROP POLICY IF EXISTS "Public read active suppliers" ON suppliers;

CREATE POLICY "Public read categories" ON marketplace_categories FOR SELECT USING (true);
CREATE POLICY "Public read active listings" ON listings FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active suppliers" ON suppliers FOR SELECT USING (is_active = true);

-- ── 7. ФУНКЦИИ ИНКРЕМЕНТА ──

CREATE OR REPLACE FUNCTION increment_listing_views(p_listing_id TEXT)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE listings SET views_count = views_count + 1 WHERE listing_id = p_listing_id;
$$;

CREATE OR REPLACE FUNCTION increment_listing_contacts(p_listing_id TEXT)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE listings SET contacts_count = contacts_count + 1 WHERE listing_id = p_listing_id;
$$;
