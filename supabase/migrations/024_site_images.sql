-- Migration 024: Site-level hero images (home cards + category headers)
-- 2026-04-22
--
-- Adds a simple slug → image_url map for editorial content that is NOT a
-- listing: the 4 hero service cards on the landing page and the header
-- banners on /catalog/[category]. Managed via admin panel.

CREATE TABLE IF NOT EXISTS site_images (
  slug        TEXT PRIMARY KEY,
  image_url   TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed all known slots so the admin UI has a stable list to render.
-- hero.*     → 4 cards on the landing page (Рабочая сила, Аренда техники,
--              Стройматериалы, Выгодно от Подряд PRO)
-- category.* → /catalog/[category] header banners (labor, equipment, materials)
INSERT INTO site_images (slug) VALUES
  ('hero.labor'),
  ('hero.equipment'),
  ('hero.materials'),
  ('hero.combo'),
  ('category.labor'),
  ('category.equipment'),
  ('category.materials')
ON CONFLICT (slug) DO NOTHING;

-- Read is public; writes go through service role only (no RLS policies needed
-- because anon client has no INSERT/UPDATE/DELETE grants by default — but we
-- enable RLS + an explicit read policy so Supabase anon key can GET rows).
ALTER TABLE site_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_images_public_read ON site_images;
CREATE POLICY site_images_public_read
  ON site_images FOR SELECT
  USING (true);
