-- =============================================================================
-- Migration 037: Materials catalog + subscriptions
-- Интеграция Premium → Подряд PRO
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUM: customer_type
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE customer_type AS ENUM ('b2c', 'b2b');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Дополнительные поля bot_contacts для B2B
-- ---------------------------------------------------------------------------
ALTER TABLE public.bot_contacts
  ADD COLUMN IF NOT EXISTS customer_type customer_type NOT NULL DEFAULT 'b2c',
  ADD COLUMN IF NOT EXISTS company_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS inn TEXT DEFAULT '';

-- ---------------------------------------------------------------------------
-- Таблица: materials — каталог материалов
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
  description   TEXT,
  unit          TEXT NOT NULL DEFAULT 'шт',
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.materials IS 'Каталог строительных материалов.';

DROP TRIGGER IF EXISTS set_updated_at ON public.materials;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Таблица: material_grades — сорта/марки материалов
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.material_grades (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id   UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  grade         TEXT NOT NULL,
  description   TEXT,
  price_per_unit NUMERIC(12,2),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.material_grades IS 'Сорта/марки материалов с ценами.';

CREATE INDEX IF NOT EXISTS idx_material_grades_material ON public.material_grades(material_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.material_grades;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.material_grades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Таблица: material_orders — заказы материалов через бота
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.material_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id    UUID NOT NULL REFERENCES public.bot_contacts(id) ON DELETE CASCADE,
  grade_id      UUID NOT NULL REFERENCES public.material_grades(id),
  quantity      NUMERIC(12,2) NOT NULL,
  unit          TEXT NOT NULL DEFAULT 'шт',
  price_per_unit NUMERIC(12,2),
  total_price   NUMERIC(12,2),
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'quoted', 'paid', 'delivered', 'cancelled')),
  delivery_address TEXT,
  description   TEXT,
  order_id      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.material_orders IS 'Заказы материалов через бота. order_id — связь с orders.';

CREATE INDEX IF NOT EXISTS idx_mo_contact ON public.material_orders(contact_id);
CREATE INDEX IF NOT EXISTS idx_mo_status ON public.material_orders(status);

DROP TRIGGER IF EXISTS set_updated_at ON public.material_orders;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.material_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Таблица: subscriptions — подписки на регулярные услуги
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id    UUID NOT NULL REFERENCES public.bot_contacts(id) ON DELETE CASCADE,
  service_kind  bot_service_kind NOT NULL,
  interval_days INT NOT NULL DEFAULT 14,
  next_run_at   TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subscriptions IS 'Подписки клиентов на регулярные услуги (покос, чистка бассейна и т.д.).';

CREATE INDEX IF NOT EXISTS idx_subscriptions_contact ON public.subscriptions(contact_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_run ON public.subscriptions(next_run_at) WHERE is_active = true;

DROP TRIGGER IF EXISTS set_updated_at ON public.subscriptions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "materials_service_all" ON public.materials
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "material_grades_service_all" ON public.material_grades
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "material_orders_service_all" ON public.material_orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "subscriptions_service_all" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Публичный read для каталога
DROP POLICY IF EXISTS "anon read materials" ON public.materials;
CREATE POLICY "anon read materials" ON public.materials
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "anon read material_grades" ON public.material_grades;
CREATE POLICY "anon read material_grades" ON public.material_grades
  FOR SELECT USING (is_active = true);
