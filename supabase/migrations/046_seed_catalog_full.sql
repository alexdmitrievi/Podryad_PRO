-- =============================================================================
-- Migration 044: Полный сид каталога для ботов и PWA
-- =============================================================================
-- Идемпотентная: можно прогонять много раз. Только ДОБАВЛЯЕТ строки.
-- 1. Добивает bot_services до 14 видов (бот выводит полное меню).
-- 2. Засевает service_region_prices для Омска и Новосибирска (+5 % НСК).
-- 3. Засевает material_grade_region_prices из price_per_unit (НСК +5 %).
-- 4. Создаёт справочник subscription_plans (basic / comfort / premium).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Услуги: добиваем до 14
-- ---------------------------------------------------------------------------
INSERT INTO public.bot_services
  (kind, name, short_name, description, unit, price_min, price_max, season_months, sort_order, work_type_map, is_active)
VALUES
  ('weed_removal',     'Удаление сорняков и высокой травы', 'Сорняк / трава',
   'Покос высокой травы и удаление сорняков на запущенных участках', 'сотка',
   400, 1200, '{5,6,7,8,9}', 10, 'labor', true),
  ('pool_maintenance', 'Обслуживание бассейна', 'Обслуживание бассейна',
   'Регулярное обслуживание бассейна: чистка, химия, проверка фильтра', 'шт',
   1500, 5000, '{5,6,7,8,9}', 11, 'labor', true),
  ('welding',          'Сварочные работы', 'Сварка',
   'Сварка ворот, заборов, металлоконструкций, петель и каркасов', 'шт',
   1000, 5000, '{1,2,3,4,5,6,7,8,9,10,11,12}', 12, 'labor', true),
  ('tilling',          'Вспашка участка', 'Вспашка',
   'Вспашка мотоблоком или мини-трактором, культивация почвы', 'сотка',
   800, 2500, '{4,5,9,10}', 13, 'equipment', true),
  ('subscription',     'Абонентское обслуживание', 'Абонентка',
   'Регулярные выезды по графику: покос, обслуживание бассейна и т.д.', 'мес',
   8000, 25000, '{4,5,6,7,8,9,10}', 14, 'labor', true)
ON CONFLICT (kind) DO UPDATE SET
  name          = EXCLUDED.name,
  short_name    = EXCLUDED.short_name,
  description   = COALESCE(public.bot_services.description, EXCLUDED.description),
  unit          = COALESCE(public.bot_services.unit, EXCLUDED.unit),
  price_min     = COALESCE(public.bot_services.price_min, EXCLUDED.price_min),
  price_max     = COALESCE(public.bot_services.price_max, EXCLUDED.price_max),
  sort_order    = EXCLUDED.sort_order,
  work_type_map = COALESCE(public.bot_services.work_type_map, EXCLUDED.work_type_map),
  is_active     = true;

-- ---------------------------------------------------------------------------
-- 2. service_region_prices: Омск = базовая, Новосибирск = +5 %
-- ---------------------------------------------------------------------------
INSERT INTO public.service_region_prices (service_id, region, price_min, price_max)
SELECT s.id, 'omsk'::region_name, s.price_min, s.price_max
  FROM public.bot_services s
 WHERE s.price_min IS NOT NULL
ON CONFLICT (service_id, region) DO NOTHING;

INSERT INTO public.service_region_prices (service_id, region, price_min, price_max)
SELECT s.id, 'novosibirsk'::region_name,
       ROUND(s.price_min * 1.05, 2),
       ROUND(s.price_max * 1.05, 2)
  FROM public.bot_services s
 WHERE s.price_min IS NOT NULL
ON CONFLICT (service_id, region) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. material_grade_region_prices: те же марки, НСК +5 %
-- ---------------------------------------------------------------------------
INSERT INTO public.material_grade_region_prices (grade_id, region, price_per_unit)
SELECT g.id, 'omsk'::region_name, g.price_per_unit
  FROM public.material_grades g
 WHERE g.price_per_unit IS NOT NULL AND g.is_active
ON CONFLICT (grade_id, region) DO NOTHING;

INSERT INTO public.material_grade_region_prices (grade_id, region, price_per_unit)
SELECT g.id, 'novosibirsk'::region_name, ROUND(g.price_per_unit * 1.05, 2)
  FROM public.material_grades g
 WHERE g.price_per_unit IS NOT NULL AND g.is_active
ON CONFLICT (grade_id, region) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. subscription_plans — справочник пакетов (новая таблица, не ломаем
--    существующую public.subscriptions, у неё другая роль: подписка контакта)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  short_name  TEXT NOT NULL,
  description TEXT,
  price_min   NUMERIC(12,2),
  price_max   NUMERIC(12,2),
  visits_per_month INT,
  features    JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order  INT  NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subscription_plans IS
  'Справочник пакетов абонентского обслуживания (basic/comfort/premium).';

DROP TRIGGER IF EXISTS set_updated_at ON public.subscription_plans;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_service_all" ON public.subscription_plans;
CREATE POLICY "subscription_plans_service_all" ON public.subscription_plans
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "anon read subscription_plans" ON public.subscription_plans;
CREATE POLICY "anon read subscription_plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

INSERT INTO public.subscription_plans
  (code, name, short_name, description, price_min, price_max, visits_per_month, features, sort_order)
VALUES
  ('basic',
   'Базовый',
   'Базовый',
   'Покос газона раз в 2 недели, базовая прополка. Подходит для участков до 10 соток.',
   8000, 14000, 2,
   '["Покос 2 раза в месяц","Прополка","Уборка скошенной травы"]'::jsonb,
   1),
  ('comfort',
   'Комфорт',
   'Комфорт',
   'Еженедельный покос, скарификация в начале сезона, обслуживание клумб.',
   14000, 22000, 4,
   '["Покос каждую неделю","Скарификация","Обслуживание клумб","Подкормка газона"]'::jsonb,
   2),
  ('premium',
   'Премиум',
   'Премиум',
   'Полный уход: покос, скарификация, аэрация, обслуживание бассейна, подрезка кустарников.',
   25000, 45000, 4,
   '["Покос каждую неделю","Скарификация и аэрация","Обслуживание бассейна","Подрезка кустарников","Полив по графику"]'::jsonb,
   3)
ON CONFLICT (code) DO UPDATE SET
  name             = EXCLUDED.name,
  short_name       = EXCLUDED.short_name,
  description      = EXCLUDED.description,
  price_min        = EXCLUDED.price_min,
  price_max        = EXCLUDED.price_max,
  visits_per_month = EXCLUDED.visits_per_month,
  features         = EXCLUDED.features,
  sort_order       = EXCLUDED.sort_order,
  is_active        = true;
