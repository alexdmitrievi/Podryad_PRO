-- 022: Add own_equipment listing type + rental metadata columns
-- "Наша техника" — equipment owned by Подряд PRO, always 20% off market rate

-- 1. Extend listing_type CHECK
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_listing_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_listing_type_check
  CHECK (listing_type IN ('labor', 'material', 'equipment_rental', 'own_equipment'));

-- 2. Add structured specs column (JSONB for rich equipment characteristics)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS specs_json JSONB DEFAULT '{}';

-- 3. Discount metadata
ALTER TABLE listings ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0;

-- 4. Rental period constraints
ALTER TABLE listings ADD COLUMN IF NOT EXISTS min_rental_hours INTEGER DEFAULT 4;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS max_rental_days INTEGER DEFAULT 30;

-- 5. Equipment metadata
ALTER TABLE listings ADD COLUMN IF NOT EXISTS includes_operator BOOLEAN DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS year_manufactured INTEGER;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vehicle_number TEXT;

-- 6. Index for own_equipment public queries
CREATE INDEX IF NOT EXISTS idx_listings_own_equipment
  ON listings(is_active, created_at DESC)
  WHERE listing_type = 'own_equipment';

COMMENT ON COLUMN listings.specs_json IS
  'Structured equipment specs: {"power":"150 л.с.","bucket":"0.8 м³","weight":"18 т",...}';
COMMENT ON COLUMN listings.discount_percent IS
  '20 for own_equipment (Подряд PRO owned), 0 for third-party listings';
