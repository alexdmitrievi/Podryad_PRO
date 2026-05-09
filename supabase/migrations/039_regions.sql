-- =============================================================================
-- Migration 039: Multi-region support
-- Интеграция Premium → Подряд PRO
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUM: region_name
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE region_name AS ENUM ('omsk', 'novosibirsk');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Таблица: regions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regions (
  code          region_name PRIMARY KEY,
  name          TEXT NOT NULL,
  timezone      TEXT NOT NULL DEFAULT 'Asia/Omsk',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.regions IS 'Регионы обслуживания (Омск, Новосибирск).';

-- ---------------------------------------------------------------------------
-- Добавляем region на ключевые таблицы
-- ---------------------------------------------------------------------------
ALTER TABLE public.bot_contacts
  ADD COLUMN IF NOT EXISTS region region_name NOT NULL DEFAULT 'omsk';

ALTER TABLE public.bot_sessions
  ADD COLUMN IF NOT EXISTS region region_name NOT NULL DEFAULT 'omsk';

ALTER TABLE public.bot_leads
  ADD COLUMN IF NOT EXISTS region region_name NOT NULL DEFAULT 'omsk';

ALTER TABLE public.material_orders
  ADD COLUMN IF NOT EXISTS region region_name NOT NULL DEFAULT 'omsk';

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS region region_name NOT NULL DEFAULT 'omsk';

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS region region_name;

ALTER TABLE public.traffic_sources
  ADD COLUMN IF NOT EXISTS region region_name;

-- ---------------------------------------------------------------------------
-- Таблица: service_region_prices — региональные цены на услуги
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_region_prices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id    UUID NOT NULL REFERENCES public.bot_services(id) ON DELETE CASCADE,
  region        region_name NOT NULL,
  price_min     NUMERIC(12,2),
  price_max     NUMERIC(12,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_id, region)
);

DROP TRIGGER IF EXISTS set_updated_at ON public.service_region_prices;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.service_region_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Таблица: material_grade_region_prices — региональные цены на материалы
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.material_grade_region_prices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id      UUID NOT NULL REFERENCES public.material_grades(id) ON DELETE CASCADE,
  region        region_name NOT NULL,
  price_per_unit NUMERIC(12,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grade_id, region)
);

DROP TRIGGER IF EXISTS set_updated_at ON public.material_grade_region_prices;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.material_grade_region_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RPC: resolve_region — определяет регион по городу/данным
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_resolve_region(p_city TEXT)
RETURNS region_name
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN LOWER(COALESCE(p_city, '')) IN ('новосибирск', 'novosibirsk') THEN 'novosibirsk'::region_name
    ELSE 'omsk'::region_name
  END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: set_contact_region
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_set_contact_region(
  p_contact_id UUID,
  p_region region_name
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.bot_contacts SET region = p_region, updated_at = now()
   WHERE id = p_contact_id;
END $$;

REVOKE ALL ON FUNCTION public.rpc_set_contact_region(UUID, region_name) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_set_contact_region(UUID, region_name) TO service_role;

-- ---------------------------------------------------------------------------
-- Seed: регионы по умолчанию
-- ---------------------------------------------------------------------------
INSERT INTO public.regions (code, name, timezone)
VALUES ('omsk', 'Омск', 'Asia/Omsk'),
       ('novosibirsk', 'Новосибирск', 'Asia/Novosibirsk')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_region_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_grade_region_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "regions_service_all" ON public.regions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "srp_service_all" ON public.service_region_prices
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "mgrp_service_all" ON public.material_grade_region_prices
  FOR ALL USING (auth.role() = 'service_role');

-- Публичный read для регионов
DROP POLICY IF EXISTS "anon read regions" ON public.regions;
CREATE POLICY "anon read regions" ON public.regions
  FOR SELECT USING (is_active = true);
