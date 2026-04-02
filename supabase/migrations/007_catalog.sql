-- =============================================================
-- Подряд PRO — Миграция 007: Единый каталог
-- =============================================================
-- Выполнить в Supabase SQL Editor.

-- ── 1. НОВЫЕ ПОЛЯ В listings ──

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS listing_type TEXT
    CHECK (listing_type IN ('labor', 'material', 'equipment_rental')),
  ADD COLUMN IF NOT EXISTS display_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS markup_percent DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS orders_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Заполнить display_price из price для существующих строк
UPDATE listings SET display_price = price WHERE display_price IS NULL;

-- Проставить listing_type по типу категории для существующих строк
UPDATE listings l
SET listing_type = CASE mc.type
  WHEN 'material' THEN 'material'
  WHEN 'heavy_equipment' THEN 'equipment_rental'
  ELSE 'material'
END
FROM marketplace_categories mc
WHERE l.category_slug = mc.slug
  AND l.listing_type IS NULL;

-- ── 2. НОВЫЕ ПОЛЯ В suppliers ──

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS worker_type TEXT DEFAULT 'individual'
    CHECK (worker_type IN ('individual', 'crew')),
  ADD COLUMN IF NOT EXISTS crew_size INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_orders INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS name TEXT;

-- Заполнить name из company_name
UPDATE suppliers SET name = company_name WHERE name IS NULL;

-- ── 3. ИНДЕКСЫ ──

CREATE INDEX IF NOT EXISTS idx_listings_type ON listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_listings_priority ON listings(is_priority DESC, rating DESC);
CREATE INDEX IF NOT EXISTS idx_listings_subcategory ON listings(subcategory);
CREATE INDEX IF NOT EXISTS idx_suppliers_worker_type ON suppliers(worker_type);
