-- =============================================================
-- Подряд PRO — Полная схема базы данных (Supabase / PostgreSQL)
-- =============================================================
-- Автосгенерировано из миграций 001–031
-- Порядок важен: сначала таблицы без FK, потом зависимые.
-- =============================================================

-- =============================================================
-- 001_initial_schema.sql
-- =============================================================

-- =============================================================
-- Подряд PRO — Полная схема базы данных (Supabase / PostgreSQL)
-- =============================================================
-- Выполнить в Supabase SQL Editor целиком.
-- Порядок важен: сначала таблицы без FK, потом зависимые.

-- ── 1. USERS (регистрация через PWA: телефон + пароль) ──

CREATE TABLE IF NOT EXISTS users (
  phone         TEXT PRIMARY KEY,                     -- нормализованный: 79001234567
  name          TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('customer', 'worker')),
  email         TEXT,
  entity_type   TEXT NOT NULL DEFAULT 'person'
                  CHECK (entity_type IN ('person', 'selfemployed', 'ip', 'company')),
  company_name  TEXT NOT NULL DEFAULT '',
  inn           TEXT NOT NULL DEFAULT '',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(lower(email)) WHERE email IS NOT NULL;

-- ── 2. WORKERS (исполнители — создаются через Telegram-бот или PWA) ──

CREATE TABLE IF NOT EXISTS workers (
  telegram_id     TEXT PRIMARY KEY,                 -- Telegram user ID (или 'pwa:<phone>' для PWA)
  username        TEXT NOT NULL DEFAULT '',
  name            TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  rating          NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  jobs_count      INTEGER NOT NULL DEFAULT 0,
  white_list      BOOLEAN NOT NULL DEFAULT false,
  is_vip          BOOLEAN NOT NULL DEFAULT false,
  vip_expires_at  TIMESTAMPTZ,
  skills          TEXT NOT NULL DEFAULT '',
  balance         NUMERIC(10,2) NOT NULL DEFAULT 0,
  ban_until       TIMESTAMPTZ,
  is_selfemployed BOOLEAN NOT NULL DEFAULT false,
  card_last4      TEXT,
  accepted_offer  BOOLEAN NOT NULL DEFAULT false,
  city            TEXT NOT NULL DEFAULT '',
  about           TEXT NOT NULL DEFAULT '',
  user_phone      TEXT REFERENCES users(phone),     -- связь с PWA-пользователем
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone);
CREATE INDEX IF NOT EXISTS idx_workers_white_list ON workers(white_list);
CREATE INDEX IF NOT EXISTS idx_workers_rating ON workers(rating DESC);
CREATE INDEX IF NOT EXISTS idx_workers_user_phone ON workers(user_phone);

-- ── 3. RATES (тарифы по типам работ) ──

CREATE TABLE IF NOT EXISTS rates (
  id          SERIAL PRIMARY KEY,
  work_type   TEXT NOT NULL UNIQUE,
  client_rate INTEGER NOT NULL,                     -- ₽/час для заказчика
  worker_rate INTEGER NOT NULL,                     -- ₽/час для исполнителя
  margin      INTEGER NOT NULL,                     -- маржа ₽/час
  min_hours   INTEGER NOT NULL DEFAULT 2,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. ORDERS (заказы) ──

CREATE TABLE IF NOT EXISTS orders (
  order_id       TEXT PRIMARY KEY,                  -- формат: n8n-uuid или pwa-uuid
  customer_id    TEXT NOT NULL DEFAULT '',           -- telegram_id или 'reg:<phone>'
  address        TEXT NOT NULL DEFAULT '',
  lat            NUMERIC(9,6) NOT NULL DEFAULT 0,
  lon            NUMERIC(9,6) NOT NULL DEFAULT 0,
  yandex_link    TEXT NOT NULL DEFAULT '',
  time           TEXT NOT NULL DEFAULT '',           -- свободный текст: "завтра 10:00"
  payment_text   TEXT NOT NULL DEFAULT '',
  people         INTEGER NOT NULL DEFAULT 1 CHECK (people BETWEEN 1 AND 50),
  hours          INTEGER NOT NULL DEFAULT 1 CHECK (hours BETWEEN 1 AND 24),
  work_type      TEXT NOT NULL DEFAULT '',
  comment        TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','paid','published','closed','cancelled','done')),
  executor_id    TEXT,                              -- telegram_id или 'reg:<phone>' воркера
  message_id     TEXT,                              -- ID поста в Telegram-канале
  client_rate    NUMERIC(10,2),
  worker_rate    NUMERIC(10,2),
  client_total   NUMERIC(10,2),
  worker_payout  NUMERIC(10,2),
  margin         NUMERIC(10,2),
  payout_status  TEXT CHECK (payout_status IS NULL OR payout_status IN ('pending','paid')),
  payout_at      TIMESTAMPTZ,
  max_posted     BOOLEAN NOT NULL DEFAULT false,
  max_message_id TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_executor ON orders(executor_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_work_type ON orders(work_type);

-- ── 5. PAYMENTS (транзакции YooKassa) ──

CREATE TABLE IF NOT EXISTS payments (
  payment_id    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id      TEXT,                               -- NULL для VIP/pick
  payer_id      TEXT NOT NULL DEFAULT '',            -- telegram_id или 'reg:<phone>'
  recipient_id  TEXT,                                -- исполнитель (для выплат)
  amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  type          TEXT NOT NULL CHECK (type IN ('order','vip','pick','rental','payout')),
  direction     TEXT NOT NULL DEFAULT 'incoming'
                  CHECK (direction IN ('incoming','outgoing')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','paid','refunded','failed')),
  yukassa_id    TEXT,
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_yukassa ON payments(yukassa_id);

-- ── 6. EQUIPMENT (каталог техники для аренды) ──

CREATE TABLE IF NOT EXISTS equipment (
  equipment_id      TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  category          TEXT NOT NULL CHECK (category IN ('garden','construction','special')),
  description       TEXT NOT NULL DEFAULT '',
  specs             TEXT NOT NULL DEFAULT '',
  rate_4h           NUMERIC(10,2) NOT NULL DEFAULT 0,
  rate_day          NUMERIC(10,2) NOT NULL DEFAULT 0,
  rate_3days        NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit           NUMERIC(10,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'available'
                      CHECK (status IN ('available','rented','maintenance')),
  image_placeholder TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);

-- ── 7. RENTALS (бронирования техники) ──

CREATE TABLE IF NOT EXISTS rentals (
  rental_id       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id    TEXT NOT NULL REFERENCES equipment(equipment_id),
  equipment_name  TEXT NOT NULL DEFAULT '',
  renter_id       TEXT NOT NULL DEFAULT '',          -- telegram_id или 'reg:<phone>'
  renter_name     TEXT NOT NULL DEFAULT '',
  duration        TEXT NOT NULL DEFAULT '',           -- '4h', 'day', '3days'
  duration_hours  INTEGER NOT NULL DEFAULT 4,
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit         NUMERIC(10,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','returned','cancelled')),
  yukassa_id      TEXT,
  paid_at         TIMESTAMPTZ,
  returned_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rentals_equipment ON rentals(equipment_id);
CREATE INDEX IF NOT EXISTS idx_rentals_renter ON rentals(renter_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);

-- ── 8. PUSH_SUBSCRIPTIONS (подписки Web Push) ──

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    TEXT NOT NULL,
  phone      TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active  BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_phone ON push_subscriptions(phone);
CREATE INDEX IF NOT EXISTS idx_push_subs_role ON push_subscriptions(role);

-- =============================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================
-- Supabase anon-клиент (используется на фронте для realtime).
-- service_role обходит RLS — серверные API-роуты работают через него.

-- orders: anon может читать published, realtime работает
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_published" ON orders
  FOR SELECT USING (status = 'published');

CREATE POLICY "orders_service_all" ON orders
  FOR ALL USING (auth.role() = 'service_role');

-- workers: anon может читать активных (для каталога)
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workers_select_public" ON workers
  FOR SELECT USING (white_list = true AND (ban_until IS NULL OR ban_until < now()));

CREATE POLICY "workers_service_all" ON workers
  FOR ALL USING (auth.role() = 'service_role');

-- rates: публичное чтение
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rates_select_all" ON rates
  FOR SELECT USING (true);

CREATE POLICY "rates_service_all" ON rates
  FOR ALL USING (auth.role() = 'service_role');

-- users: только service_role
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_service_all" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- payments: только service_role
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_service_all" ON payments
  FOR ALL USING (auth.role() = 'service_role');

-- equipment: публичное чтение
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipment_select_all" ON equipment
  FOR SELECT USING (true);

CREATE POLICY "equipment_service_all" ON equipment
  FOR ALL USING (auth.role() = 'service_role');

-- rentals: только service_role
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rentals_service_all" ON rentals
  FOR ALL USING (auth.role() = 'service_role');

-- push_subscriptions: только service_role
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subs_service_all" ON push_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================
-- REALTIME
-- =============================================================
-- Dashboard слушает postgres_changes на orders.
-- В Supabase Dashboard → Database → Publications → supabase_realtime:
-- добавить таблицу `orders` если ещё нет.

-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;
-- (Раскомментировать если Supabase поддерживает прямые ALTER PUBLICATION)

-- =============================================================
-- SEED DATA: Тарифы
-- =============================================================

INSERT INTO rates (work_type, client_rate, worker_rate, margin, min_hours, is_active) VALUES
  ('грузчики',     700, 500, 200, 2, true),
  ('уборка',       600, 400, 200, 2, true),
  ('стройка',      900, 650, 250, 3, true),
  ('разнорабочие', 650, 450, 200, 2, true),
  ('другое',       600, 400, 200, 1, true)
ON CONFLICT (work_type) DO UPDATE SET
  client_rate = EXCLUDED.client_rate,
  worker_rate = EXCLUDED.worker_rate,
  margin      = EXCLUDED.margin,
  min_hours   = EXCLUDED.min_hours,
  is_active   = EXCLUDED.is_active,
  updated_at  = now();

-- =============================================================
-- SEED DATA: Техника
-- =============================================================

INSERT INTO equipment (equipment_id, name, category, description, specs, rate_4h, rate_day, rate_3days, deposit, status, image_placeholder) VALUES
  ('mower-1',           'Газонокосилка бензиновая самоходная',  'garden',       'Для стрижки газонов на участках до 15 соток.',                    'Ширина скоса 46 см, бак 1 л, травосборник 60 л',               800,  1200, 3000, 5000, 'available', '🏎️'),
  ('scarifier-1',       'Скарификатор-аэратор',                 'garden',       'Для аэрации и вычёсывания газона.',                              'Ширина обработки 38 см, электрический',                         600,  900,  2200, 3000, 'available', '🌱'),
  ('trimmer-1',         'Триммер бензиновый',                   'garden',       'Для покоса травы в труднодоступных местах.',                      'Двигатель 2-тактный, нож + леска',                              500,  800,  2000, 3000, 'available', '🌾'),
  ('hedger-1',          'Кусторез аккумуляторный',              'garden',       'Для стрижки кустов и живой изгороди.',                           'Длина шины 50 см, аккумулятор 18В 4Ач',                         500,  700,  1800, 3000, 'available', '✂️'),
  ('cultivator-1',      'Мотокультиватор',                      'garden',       'Для вспашки и рыхления земли на грядках.',                       'Ширина обработки 40 см, глубина до 25 см',                      800,  1200, 3000, 5000, 'available', '🚜'),
  ('chainsaw-1',        'Бензопила',                            'garden',       'Для спила деревьев, распиловки брёвен.',                          'Шина 40 см, мощность 2.4 л.с.',                                600,  900,  2200, 4000, 'available', '🪚'),
  ('snowblower-1',      'Снегоуборщик',                         'garden',       'Для уборки снега на дорожках и дворах.',                         'Ширина захвата 56 см, дальность выброса до 10 м',               1000, 1500, 3800, 5000, 'available', '❄️'),
  ('hammer-drill-1',    'Перфоратор',                           'construction', 'Для сверления и долбления бетона, кирпича.',                     'SDS-Plus, 800Вт, 3 режима, кейс + набор буров',                400,  600,  1500, 3000, 'available', '🔩'),
  ('grinder-1',         'УШМ (болгарка) 230 мм',               'construction', 'Для резки металла, бетона, плитки.',                             '2200Вт, диск 230 мм, плавный пуск',                            400,  600,  1500, 3000, 'available', '💿'),
  ('tile-cutter-1',     'Плиткорез электрический',              'construction', 'Для точной резки керамической плитки.',                          'Длина реза до 60 см, водяное охлаждение',                       500,  800,  2000, 4000, 'available', '🧱'),
  ('vacuum-1',          'Строительный пылесос',                 'construction', 'Для уборки строительной пыли и мусора.',                         'Мощность 1400Вт, бак 30 л, розетка для инструмента',            400,  600,  1500, 3000, 'available', '🫧'),
  ('heat-gun-1',        'Строительный фен',                     'construction', 'Для снятия краски, усадки термоусадки.',                         '2000Вт, температура до 600°C, 3 насадки',                       300,  500,  1200, 2000, 'available', '🔥'),
  ('toolkit-1',         'Универсальный набор инструмента',      'construction', 'Полный набор ручного инструмента для ремонта.',                  '120+ предметов: ключи, отвёртки, плоскогубцы, головки, биты',   300,  500,  1200, 3000, 'available', '🧰'),
  ('pressure-washer-1', 'Мойка высокого давления',              'special',      'Для мойки машин, фасадов, заборов.',                             'Давление до 150 бар, шланг 8 м, 3 насадки',                     600,  1000, 2500, 4000, 'available', '💦'),
  ('generator-1',       'Бензогенератор 3 кВт',                 'special',      'Для питания электроинструмента без электричества.',               '3 кВт, бак 15 л, работа до 10 часов, 2 розетки 220В',           800,  1200, 3000, 5000, 'available', '⚡')
ON CONFLICT (equipment_id) DO UPDATE SET
  name              = EXCLUDED.name,
  category          = EXCLUDED.category,
  description       = EXCLUDED.description,
  specs             = EXCLUDED.specs,
  rate_4h           = EXCLUDED.rate_4h,
  rate_day          = EXCLUDED.rate_day,
  rate_3days        = EXCLUDED.rate_3days,
  deposit           = EXCLUDED.deposit,
  image_placeholder = EXCLUDED.image_placeholder;

-- =============================================================
-- 002_add_worker_fields.sql
-- =============================================================

-- Migration 002: Add worker profile fields for PWA onboarding
-- Добавляет поля city и about для профиля воркера через PWA.

ALTER TABLE workers ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';
ALTER TABLE workers ADD COLUMN IF NOT EXISTS about TEXT NOT NULL DEFAULT '';

-- =============================================================
-- 003_add_user_email_fields.sql
-- =============================================================

-- Migration 003: Добавить email и поля бизнес-субъекта в таблицу users
-- Регистрация собирает email, entity_type, company_name, inn,
-- но эти колонки отсутствовали в исходной схеме.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT 'person'
  CHECK (entity_type IN ('person', 'selfemployed', 'ip', 'company'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS inn TEXT NOT NULL DEFAULT '';

-- Уникальный частичный индекс: предотвращает дубли email, разрешает множественные NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
  ON users(lower(email)) WHERE email IS NOT NULL;

-- =============================================================
-- 004_material_requests.sql
-- =============================================================

-- ── 004: Таблица заявок на материалы ──────────────────────────────────────
-- Применить: Supabase Dashboard → SQL Editor → Run

CREATE TABLE IF NOT EXISTS material_requests (
  id          BIGSERIAL PRIMARY KEY,
  phone       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Отключаем RLS — вставка только через service_role с сервера
ALTER TABLE material_requests DISABLE ROW LEVEL SECURITY;

-- =============================================================
-- 005_marketplace.sql
-- =============================================================

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

-- =============================================================
-- 006_escrow.sql
-- =============================================================

-- =============================================================
-- Подряд PRO — Миграция 006: Escrow payment support
-- =============================================================
-- Non-breaking: all new columns have DEFAULT NULL or DEFAULT false/''
-- Do NOT touch: order_id, status, executor_id, client_total, worker_payout, margin

-- ── 1. ALTER TABLE orders — add 18 new escrow columns (per D-01) ──

ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_fee_rate NUMERIC(4,2) DEFAULT 10.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_fee NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS combo_discount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_amount NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS escrow_status TEXT NOT NULL DEFAULT ''
  CHECK (escrow_status IN ('', 'payment_held', 'in_progress', 'pending_confirm', 'completed', 'disputed', 'cancelled'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS yookassa_payment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_captured BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_held_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_captured_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_confirmed BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_confirmed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supplier_confirmed BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supplier_confirmed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_status_escrow TEXT CHECK (payout_status_escrow IS NULL OR payout_status_escrow IN ('pending', 'processing', 'succeeded', 'failed'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- ── 2. ALTER TABLE workers — add payout columns (per D-04) ──

-- payout_card: last-4 digits for display only (never raw card number)
-- payout_card_synonym: YooKassa card synonym (PCI-safe token for Payouts API)
ALTER TABLE workers ADD COLUMN IF NOT EXISTS payout_card TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS payout_card_synonym TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_selfemployed_verified BOOLEAN DEFAULT false;

-- ── 3. CREATE TABLE escrow_ledger (per D-05) ──
-- IMPORTANT: column is `type` (NOT `event_type`)

CREATE TABLE IF NOT EXISTS escrow_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  type TEXT NOT NULL CHECK (type IN ('hold', 'capture', 'release', 'refund', 'payout')),
  amount NUMERIC(10,2) NOT NULL,
  yookassa_operation_id TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_order ON escrow_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_type ON escrow_ledger(type);

-- ── 4. CREATE TABLE disputes (per D-05) ──

CREATE TABLE IF NOT EXISTS disputes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  initiated_by TEXT NOT NULL CHECK (initiated_by IN ('customer', 'supplier')),
  reason TEXT NOT NULL,
  description TEXT,
  resolution TEXT CHECK (resolution IS NULL OR resolution IN ('refund_full', 'refund_partial', 'release_payment', 'pending')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_disputes_order ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_resolution ON disputes(resolution);

-- ── 5. RLS for new tables (service_role only) ──

ALTER TABLE escrow_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escrow_ledger_service_all" ON escrow_ledger
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disputes_service_all" ON disputes
  FOR ALL USING (auth.role() = 'service_role');

-- ── 6. Indexes on orders escrow columns ──

CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON orders(escrow_status) WHERE escrow_status != '';
CREATE INDEX IF NOT EXISTS idx_orders_payment_held ON orders(payment_held_at) WHERE payment_captured = false AND escrow_status = 'payment_held';
CREATE INDEX IF NOT EXISTS idx_orders_yookassa_pid ON orders(yookassa_payment_id) WHERE yookassa_payment_id IS NOT NULL;

-- ── 7. pg_cron + pg_net extensions and auto-capture cron job (per D-03) ──

-- Enable pg_net and pg_cron extensions (Supabase Pro plan required)
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- IMPORTANT: Before this migration runs, set these database secrets:
--   ALTER DATABASE postgres SET app.cron_webhook_url = 'https://podryad.pro/api/cron/capture-expired';
--   ALTER DATABASE postgres SET app.cron_secret = '<your-cron-secret>';
-- These can also be set via Supabase Dashboard -> Settings -> Vault -> Secrets

-- Register auto-capture cron job (09:00 MSK = 06:00 UTC daily)
SELECT cron.schedule(
  'auto-capture-escrow-holds',
  '0 6 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.cron_webhook_url', true),
    headers := json_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    )::jsonb,
    body := '{}'::jsonb
  )$$
);

-- =============================================================
-- 007_catalog.sql
-- =============================================================

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

-- =============================================================
-- 008_orders_markup.sql
-- =============================================================

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

-- =============================================================
-- 009_leads.sql
-- =============================================================

-- Migration 009: leads table for landing page lead capture
-- 2026-04-02

CREATE TABLE IF NOT EXISTS leads (
  id          BIGSERIAL PRIMARY KEY,
  phone       TEXT        NOT NULL,
  work_type   TEXT        NOT NULL,  -- 'labor' | 'equipment' | 'materials' | 'complex'
  city        TEXT        NOT NULL DEFAULT 'omsk',
  comment     TEXT,
  source      TEXT        NOT NULL DEFAULT 'landing',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for admin queries (by created_at desc)
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);

-- Index for deduplication check (phone + recent)
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone);

-- RLS: service role only (leads are internal, no public access needed)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by API route with service key)
CREATE POLICY "service_role_all" ON leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================
-- 010_payout_method.sql
-- =============================================================

-- Migration 010: payout_method column for flexible executor payouts
-- 2026-04-02

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_method TEXT
  DEFAULT 'manual_transfer'
  CHECK (payout_method IN ('yookassa_payout', 'manual_transfer', 'cash'));

-- =============================================================
-- 011_contractors_tokens.sql
-- =============================================================

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

-- =============================================================
-- 012_leads_address_contacts.sql
-- =============================================================

-- Migration 012: add address and contact fields to leads for map display and admin CRM

ALTER TABLE leads ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS messenger TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS telegram TEXT;

-- =============================================================
-- 013_crm_agent.sql
-- =============================================================

-- Migration 013: CRM Agent Tables
-- Воронка продаж для заказчиков и агент по привлечению исполнителей с Авито
-- 2026-04-10

-- ── 1. CRM LEAD FUNNEL (воронка заказчиков) ──

CREATE TABLE IF NOT EXISTS crm_lead_funnel (
  id              BIGSERIAL PRIMARY KEY,
  lead_id         BIGINT REFERENCES leads(id) ON DELETE CASCADE,
  phone           TEXT NOT NULL,
  name            TEXT,
  work_type       TEXT,
  city            TEXT,
  messenger       TEXT,   -- 'max' | 'telegram' | 'email' | 'phone'
  email           TEXT,
  telegram        TEXT,

  -- Воронка
  stage           TEXT NOT NULL DEFAULT 'new'
                    CHECK (stage IN (
                      'new',           -- Новая заявка
                      'contacted',     -- Первое сообщение отправлено
                      'engaged',       -- Есть ответ / взаимодействие
                      'link_sent',     -- Ссылка на дашборд отправлена
                      'converted',     -- Заказ создан
                      'cold',          -- Не ответил / потерян
                      'lost'           -- Явно отказался
                    )),

  -- Автоматизация
  contact_attempts  INTEGER NOT NULL DEFAULT 0,
  last_contacted_at TIMESTAMPTZ,
  next_followup_at  TIMESTAMPTZ,
  converted_at      TIMESTAMPTZ,
  order_id          TEXT,             -- ID созданного заказа если конвертировался

  -- Заметки
  admin_notes       TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_lead_funnel_phone ON crm_lead_funnel(phone);
CREATE INDEX IF NOT EXISTS idx_crm_lead_funnel_stage ON crm_lead_funnel(stage);
CREATE INDEX IF NOT EXISTS idx_crm_lead_funnel_next_followup ON crm_lead_funnel(next_followup_at);
CREATE INDEX IF NOT EXISTS idx_crm_lead_funnel_lead_id ON crm_lead_funnel(lead_id);

-- ── 2. CRM EXECUTOR PROSPECTS (потенциальные исполнители с Авито) ──

CREATE TABLE IF NOT EXISTS crm_executor_prospects (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT NOT NULL DEFAULT '',
  phone            TEXT,
  city             TEXT NOT NULL DEFAULT 'omsk',
  specialties      TEXT[] NOT NULL DEFAULT '{}',
  source           TEXT NOT NULL DEFAULT 'avito'
                     CHECK (source IN ('avito', 'manual', 'referral', 'vk', 'other')),

  -- Авито-данные
  avito_profile_url TEXT,
  avito_user_id     TEXT,

  -- Воронка
  stage            TEXT NOT NULL DEFAULT 'new'
                     CHECK (stage IN (
                       'new',               -- Найден, не контактировали
                       'messaged',          -- Написали в Авито
                       'replied',           -- Ответил в Авито
                       'contact_collected', -- Получили телефон/контакт
                       'invite_sent',       -- Отправлена ссылка на регистрацию
                       'registered',        -- Зарегистрировался на платформе
                       'active',            -- Взял первый заказ
                       'lost',              -- Не заинтересован
                       'blocked'            -- Заблокирован
                     )),

  -- Контакт
  max_id           TEXT,
  telegram_id      TEXT,
  email            TEXT,
  
  -- Автоматизация
  contact_attempts  INTEGER NOT NULL DEFAULT 0,
  last_contacted_at TIMESTAMPTZ,
  next_followup_at  TIMESTAMPTZ,
  registered_at     TIMESTAMPTZ,
  first_order_at    TIMESTAMPTZ,

  -- Сопоставление с исполнителем
  contractor_id     TEXT,  -- ID в таблице contractors после регистрации

  -- Заметки
  admin_notes       TEXT,
  avito_message_draft TEXT,  -- Черновик сообщения для Авито

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_prospects_stage ON crm_executor_prospects(stage);
CREATE INDEX IF NOT EXISTS idx_crm_prospects_phone ON crm_executor_prospects(phone);
CREATE INDEX IF NOT EXISTS idx_crm_prospects_source ON crm_executor_prospects(source);
CREATE INDEX IF NOT EXISTS idx_crm_prospects_next_followup ON crm_executor_prospects(next_followup_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_prospects_avito_id ON crm_executor_prospects(avito_user_id)
  WHERE avito_user_id IS NOT NULL;

-- ── 3. CRM MESSAGES (история коммуникаций) ──

CREATE TABLE IF NOT EXISTS crm_messages (
  id              BIGSERIAL PRIMARY KEY,
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('lead', 'prospect')),
  entity_id       BIGINT NOT NULL,   -- ID в crm_lead_funnel или crm_executor_prospects
  
  direction       TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  channel         TEXT NOT NULL CHECK (channel IN ('max', 'telegram', 'email', 'avito', 'phone', 'sms')),
  
  message_text    TEXT NOT NULL,
  is_automated    BOOLEAN NOT NULL DEFAULT true,  -- Авто или вручную менеджер
  
  -- Статус доставки
  status          TEXT NOT NULL DEFAULT 'sent'
                    CHECK (status IN ('draft', 'sent', 'delivered', 'failed', 'read')),
  external_id     TEXT,  -- ID сообщения во внешней системе

  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_messages_entity ON crm_messages(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_messages_sent_at ON crm_messages(sent_at DESC);

-- ── RLS ──

ALTER TABLE crm_lead_funnel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON crm_lead_funnel
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE crm_executor_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON crm_executor_prospects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE crm_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON crm_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- 013_executor_responses.sql
-- =============================================================

-- Migration 013: executor_responses table for dashboard order responses
-- Responses from executors go to admin for review, not to customers

CREATE TABLE IF NOT EXISTS executor_responses (
  id          BIGSERIAL PRIMARY KEY,
  order_id    TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  comment     TEXT,
  price       NUMERIC,
  status      TEXT        NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'rejected'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_executor_responses_order_id ON executor_responses (order_id);
CREATE INDEX IF NOT EXISTS idx_executor_responses_status ON executor_responses (status);
CREATE INDEX IF NOT EXISTS idx_executor_responses_created_at ON executor_responses (created_at DESC);

ALTER TABLE executor_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON executor_responses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================
-- 014_crm_rag.sql
-- =============================================================

-- Migration 014: RAG Support for CRM Agents
-- Adds conversation memory and user profile fields for context-aware message generation
-- 2026-04-12

-- ── Lead Funnel RAG fields ──
ALTER TABLE crm_lead_funnel
  ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
  ADD COLUMN IF NOT EXISTS user_preferences JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_inbound_message TEXT,
  ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;

-- ── Executor Prospects RAG fields ──
ALTER TABLE crm_executor_prospects
  ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
  ADD COLUMN IF NOT EXISTS user_preferences JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_inbound_message TEXT,
  ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;

-- ── Composite index for fast RAG history retrieval ──
CREATE INDEX IF NOT EXISTS idx_crm_messages_rag_lookup
  ON crm_messages(entity_type, entity_id, sent_at DESC);

-- =============================================================
-- 015_contractors_brigade.sql
-- =============================================================

-- Migration 015: Add brigade fields to contractors
-- Allows contractors to register as brigades with crew details

ALTER TABLE contractors ADD COLUMN IF NOT EXISTS is_brigade BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS crew_size INTEGER;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS has_transport BOOLEAN;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS has_tools BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_contractors_is_brigade ON contractors (is_brigade) WHERE is_brigade = true;

-- =============================================================
-- 016_customers.sql
-- =============================================================

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

-- =============================================================
-- 017_manual_payment.sql
-- =============================================================

-- =============================================================
-- Подряд PRO — Миграция 017: Ручная платёжка (убираем YooKassa)
-- =============================================================
-- Non-breaking: все новые колонки DEFAULT NULL / DEFAULT значения

-- ── 1. workers/contractors: реквизиты для выплаты ──

ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'sbp'
    CHECK (payout_type IN ('sbp', 'bank_transfer', 'cash')),
  ADD COLUMN IF NOT EXISTS payout_sbp_phone TEXT,           -- номер SBP (может совпадать с телефоном)
  ADD COLUMN IF NOT EXISTS payout_bank_details TEXT,        -- свободный текст: банк, счёт, БИК, ИНН
  ADD COLUMN IF NOT EXISTS inn TEXT,                        -- ИНН (для самозанятых и ИП)
  ADD COLUMN IF NOT EXISTS is_legal_entity BOOLEAN DEFAULT false;  -- ИП или ООО

-- ── 2. contractors (если отдельная таблица) ──

ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'sbp'
    CHECK (payout_type IN ('sbp', 'bank_transfer', 'cash')),
  ADD COLUMN IF NOT EXISTS payout_sbp_phone TEXT,
  ADD COLUMN IF NOT EXISTS payout_bank_details TEXT,
  ADD COLUMN IF NOT EXISTS inn TEXT,
  ADD COLUMN IF NOT EXISTS is_legal_entity BOOLEAN DEFAULT false;

-- ── 3. orders: ручное управление платежом ──

-- Тип клиента: физлицо (СБП) или юрлицо (счёт)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'individual'
    CHECK (customer_type IN ('individual', 'legal_entity')),

  -- Статус оплаты (вместо escrow)
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'invoice_sent', 'paid', 'overdue')),

  ADD COLUMN IF NOT EXISTS payment_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_paid_at TIMESTAMPTZ,

  -- Выплата исполнителю (ручная)
  ADD COLUMN IF NOT EXISTS executor_payout_status TEXT DEFAULT 'pending'
    CHECK (executor_payout_status IN ('pending', 'paid')),
  ADD COLUMN IF NOT EXISTS executor_payout_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS executor_payout_note TEXT,

  -- Реквизиты для конкретного счёта (заполняет admin при выставлении)
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC(12,2);

-- ── 4. Изменить payout_method — убираем yookassa_payout ──
-- Сначала удаляем старый constraint, ставим новый

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payout_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payout_method_check
  CHECK (payout_method IS NULL OR payout_method IN ('sbp', 'bank_transfer', 'cash'));

-- Обновляем существующие записи с yookassa_payout → sbp
UPDATE orders SET payout_method = 'sbp' WHERE payout_method = 'yookassa_payout';
UPDATE orders SET payout_method = 'manual_transfer' WHERE payout_method NOT IN ('sbp', 'bank_transfer', 'cash') AND payout_method IS NOT NULL;

-- ── 5. Индексы ──

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_type ON orders(customer_type);
CREATE INDEX IF NOT EXISTS idx_orders_executor_payout ON orders(executor_payout_status);

-- =============================================================
-- 018_cleanup_escrow.sql
-- =============================================================

-- =============================================================
-- Подряд PRO — Миграция 018: Удаление YooKassa/Escrow артефактов
-- =============================================================
-- YooKassa полностью удалена из приложения (апрель 2026).
-- Теперь используется ручная оркестрация платежей:
--   - customer: payment_status / payment_type (SBP или счёт)
--   - executor: executor_payout_status + реквизиты в contractors/workers
-- Эта миграция удаляет все мёртвые таблицы и колонки.
-- Non-destructive для живых данных: все удаляемые поля были NULL или '' в новых записях.

-- ── 1. Отключить cron-задачу авто-захвата escrow ──
SELECT cron.unschedule('auto-capture-escrow-holds')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-capture-escrow-holds');

-- ── 2. DROP TABLE escrow_ledger ──
-- Чистый лог транзакций YooKassa. Больше не используется.
DROP TABLE IF EXISTS escrow_ledger;

-- ── 3. DROP COLUMNS из orders — мёртвые escrow/YooKassa поля ──

-- Escrow pricing (заменены на display_price / customer_total / supplier_payout / platform_margin из мигр. 008)
ALTER TABLE orders DROP COLUMN IF EXISTS subtotal;
ALTER TABLE orders DROP COLUMN IF EXISTS service_fee_rate;
ALTER TABLE orders DROP COLUMN IF EXISTS service_fee;
ALTER TABLE orders DROP COLUMN IF EXISTS combo_discount;
ALTER TABLE orders DROP COLUMN IF EXISTS total;
ALTER TABLE orders DROP COLUMN IF EXISTS payout_amount;

-- YooKassa-специфичные поля
ALTER TABLE orders DROP COLUMN IF EXISTS escrow_status;
ALTER TABLE orders DROP COLUMN IF EXISTS yookassa_payment_id;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_captured;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_held_at;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_captured_at;
ALTER TABLE orders DROP COLUMN IF EXISTS payout_status_escrow;
ALTER TABLE orders DROP COLUMN IF EXISTS payout_id;

-- Email для чеков YooKassa (никогда не заполнялся в новых заявках)
ALTER TABLE orders DROP COLUMN IF EXISTS customer_email;

-- ── 4. DROP COLUMNS из workers — мёртвые payout поля YooKassa ──
-- Заменены на payout_type / payout_sbp_phone / payout_bank_details (мигр. 017)
ALTER TABLE workers DROP COLUMN IF EXISTS payout_card;
ALTER TABLE workers DROP COLUMN IF EXISTS payout_card_synonym;
ALTER TABLE workers DROP COLUMN IF EXISTS is_selfemployed_verified;

-- ── 5. DROP COLUMNS из payments и rentals — yukassa_id ──
ALTER TABLE payments DROP COLUMN IF EXISTS yukassa_id;
ALTER TABLE rentals  DROP COLUMN IF EXISTS yukassa_id;

-- ── 6. Убедиться, что новые индексы из мигр. 017 не дублируются ──
-- (Создаются заново только если отсутствуют — безопасно)
CREATE INDEX IF NOT EXISTS idx_orders_payment_status   ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_type    ON orders(customer_type);
CREATE INDEX IF NOT EXISTS idx_orders_executor_payout  ON orders(executor_payout_status);

-- ── Конец миграции ──

-- =============================================================
-- 019_drop_escrow_ledger.sql
-- =============================================================

-- Migration 019: Drop orphaned escrow_ledger table
-- The escrow system was fully removed in migration 018,
-- but the escrow_ledger table itself was not dropped.

DROP TABLE IF EXISTS escrow_ledger;

-- =============================================================
-- 020_fix_order_statuses.sql
-- =============================================================

-- Migration 020: Align orders.status CHECK constraint with code
-- 2026-04-19
--
-- Bug: The application code writes statuses that the DB constraint rejects.
-- - pwa/src/lib/db.ts:330           → .update({ status: 'in_progress', ... })
-- - pwa/src/app/api/admin/orders/[id]/send-link/route.ts:59
--                                    → .update({ status: 'payment_sent' })
-- - pwa/src/app/admin/page.tsx:561 → optimistic 'priced'
-- - pwa/src/lib/db.ts:205           → .in('status', ['completed', 'closed'])
--
-- The original constraint (schema.sql:84-85) only allowed:
--   pending, paid, published, closed, cancelled, done
--
-- These inserts/updates raise 23514 check_violation and the endpoint 500s.
-- This migration expands the CHECK to the full lifecycle actually used in code.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',       -- lead принят, ещё не оценён
    'priced',        -- админ оценил, ждём оплаты
    'payment_sent',  -- ссылка на оплату отправлена заказчику
    'paid',          -- оплата получена / эскроу удержан
    'in_progress',   -- исполнитель принял, работы идут
    'done',          -- работы завершены, обе стороны подтвердили
    'completed',     -- финализированный статус после capture/выплаты
    'published',     -- опубликован в ленте/маркетплейсе
    'closed',        -- архивный
    'cancelled'      -- отменён
  ));

-- =============================================================
-- 021_add_missing_indexes.sql
-- =============================================================

-- Migration 021: Add missing indexes on hot query paths
-- 2026-04-19
--
-- Covers performance-critical queries identified in the production audit:
--   1. customer_tokens.phone — looked up on every /api/my/recover and escrow flow
--   2. crm_executor_prospects (stage, next_followup_at) — WF-19 cron (every 6h)
--   3. crm_lead_funnel (stage, next_followup_at) — similar pattern
--   4. orders (status, created_at DESC) — admin dashboard, WF-07 MAX cross-post
--   5. orders partial filter for unpublished with coordinates — WF-07 hot filter

-- 1) customer_tokens lookup by phone
CREATE INDEX IF NOT EXISTS idx_customer_tokens_phone
  ON customer_tokens(phone);

-- 2) WF-19: stage IN (...) ORDER BY next_followup_at ASC NULLS FIRST
CREATE INDEX IF NOT EXISTS idx_crm_prospects_stage_followup
  ON crm_executor_prospects(stage, next_followup_at ASC NULLS FIRST);

-- 3) Same pattern for lead funnel
CREATE INDEX IF NOT EXISTS idx_crm_lead_funnel_stage_followup
  ON crm_lead_funnel(stage, next_followup_at ASC NULLS FIRST);

-- 4) Orders list + sort (admin dashboard, public orders feed)
CREATE INDEX IF NOT EXISTS idx_orders_status_created_desc
  ON orders(status, created_at DESC);

-- 5) WF-07 MAX cross-post runs every 2 min; partial index keeps it cheap
CREATE INDEX IF NOT EXISTS idx_orders_wf07_unpublished
  ON orders(created_at DESC)
  WHERE max_posted IS NOT TRUE
    AND lat IS NOT NULL
    AND lon IS NOT NULL
    AND status IN ('paid', 'in_progress');

-- =============================================================
-- 022_own_equipment.sql
-- =============================================================

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

-- =============================================================
-- 023_fix_status_constraint.sql
-- =============================================================

-- Migration 023: Add 'confirming' and 'disputed' to orders.status CHECK
-- 2026-04-22
--
-- Bug: /api/orders/[id]/confirm  sets status = 'confirming'
--      /api/orders/[id]/dispute  sets status = 'disputed'
-- Both values are absent from migration 020's CHECK list → DB raises
-- 23514 check_violation → 500 responses on those endpoints.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',       -- лид принят, ещё не оценён
    'priced',        -- оценён, ждём оплаты
    'payment_sent',  -- ссылка/счёт отправлены клиенту
    'paid',          -- оплата получена
    'in_progress',   -- работы идут
    'confirming',    -- обе стороны подтвердили, ожидает выплаты (добавлен в 023)
    'done',          -- работы завершены
    'completed',     -- финализирован после выплаты
    'disputed',      -- открыт спор (добавлен в 023)
    'published',     -- опубликован в ленте/маркетплейсе
    'closed',        -- архивный
    'cancelled'      -- отменён
  ));

-- =============================================================
-- 024_site_images.sql
-- =============================================================

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

-- =============================================================
-- 025_db_audit_fixes.sql
-- =============================================================

-- Migration 025: DB audit hardening — FK constraint + updated_at triggers
-- 2026-04-22
--
-- Issues found by infra audit:
-- 1. executor_responses.order_id has no FK → orphaned responses possible
-- 2. High-mutability tables (orders, disputes, executor_responses, leads,
--    crm_messages) lack updated_at → audit trail incomplete

-- ── 1. Add FK constraint on executor_responses.order_id ────────────────
-- CASCADE DELETE: if an order is deleted, its responses go with it.
ALTER TABLE executor_responses
  ADD CONSTRAINT fk_executor_responses_order
  FOREIGN KEY (order_id)
  REFERENCES orders(order_id)
  ON DELETE CASCADE;

-- ── 2. Add updated_at to orders ────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Back-fill from created_at so existing rows are not NULL
UPDATE orders SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE orders
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 3. Add updated_at to disputes ──────────────────────────────────────
ALTER TABLE disputes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE disputes SET updated_at = COALESCE(resolved_at, created_at) WHERE updated_at IS NULL;

ALTER TABLE disputes
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS disputes_set_updated_at ON disputes;
CREATE TRIGGER disputes_set_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 4. Add updated_at to executor_responses ────────────────────────────
ALTER TABLE executor_responses
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE executor_responses SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE executor_responses
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS executor_responses_set_updated_at ON executor_responses;
CREATE TRIGGER executor_responses_set_updated_at
  BEFORE UPDATE ON executor_responses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 5. Add updated_at to leads ─────────────────────────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE leads SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE leads
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS leads_set_updated_at ON leads;
CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 6. Add updated_at to crm_messages ─────────────────────────────────
ALTER TABLE crm_messages
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE crm_messages SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE crm_messages
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS crm_messages_set_updated_at ON crm_messages;
CREATE TRIGGER crm_messages_set_updated_at
  BEFORE UPDATE ON crm_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 7. site_images — add created_at for consistency ───────────────────
ALTER TABLE site_images
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── 8. executor_responses.price precision ─────────────────────────────
-- NUMERIC without precision → NUMERIC(12,2) to match orders amounts
ALTER TABLE executor_responses
  ALTER COLUMN price TYPE NUMERIC(12,2);

-- =============================================================
-- 026_rls_hardening.sql
-- =============================================================

-- Migration 026: RLS hardening — close UNRESTRICTED tables + pin function search_path
-- 2026-04-23
--
-- Issues from Supabase advisor (ERROR level):
-- 1. public.customers, public.markup_rates, public.material_requests have RLS
--    DISABLED. With anon key (published in client JS), ANY caller can SELECT,
--    UPDATE, DELETE on these tables via PostgREST. customers contains
--    password_hash + PII — critical leak.
-- 2. 5 functions have mutable search_path (WARN) — possible privilege
--    escalation if a malicious schema shadows public.
--
-- Strategy: enable RLS with NO policies. Service-role bypasses RLS by default
-- in Supabase, so backend API routes (which use SUPABASE_SERVICE_ROLE_KEY)
-- continue to work unchanged. Anon clients lose all access — exactly what we
-- want for these internal-only tables.

-- ── 1. customers (PII + auth credentials) ───────────────────────────────
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ── 2. markup_rates (business-sensitive markup %) ───────────────────────
ALTER TABLE public.markup_rates ENABLE ROW LEVEL SECURITY;

-- ── 3. material_requests (legacy, not currently called, but exposed) ────
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;

-- ── 4. Pin search_path on SECURITY-sensitive functions ──────────────────
-- A mutable search_path lets an attacker with CREATE on any schema
-- shadow public.<table> and hijack function execution.

ALTER FUNCTION public.set_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.assign_order_number()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_customers_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.increment_listing_views(p_listing_id TEXT)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.increment_listing_contacts(p_listing_id TEXT)
  SET search_path = public, pg_temp;

-- =============================================================
-- 027_job_queue.sql
-- =============================================================

-- Migration 027: durable job queue for Vercel worker execution
-- 2026-04-29
--
-- Goal:
-- Move business automation out of n8n webhooks into application code while
-- keeping retries, scheduling and locking durable inside Postgres.
--
-- Model:
-- 1. API routes insert rows into public.job_queue after successful DB writes.
-- 2. Vercel Cron calls an API route that claims a small batch via claim_jobs().
-- 3. Worker handlers execute in app code and mark jobs completed / rescheduled.

CREATE TABLE IF NOT EXISTS public.job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name TEXT NOT NULL DEFAULT 'default',
  job_type TEXT NOT NULL,
  dedupe_key TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority SMALLINT NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'dead', 'cancelled')),
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 8 CHECK (max_attempts > 0),
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  lease_until TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  result JSONB,
  source_table TEXT,
  source_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT job_queue_completed_at_chk CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status <> 'completed')
  )
);

COMMENT ON TABLE public.job_queue IS
  'Durable application job queue used by Vercel cron/worker handlers.';
COMMENT ON COLUMN public.job_queue.dedupe_key IS
  'Optional idempotency key. Unique while a job is pending or processing.';
COMMENT ON COLUMN public.job_queue.run_at IS
  'Earliest time when the job becomes eligible for claim.';
COMMENT ON COLUMN public.job_queue.lease_until IS
  'Soft lock expiry used to recover jobs abandoned by timed out workers.';

CREATE INDEX IF NOT EXISTS idx_job_queue_pending_due
  ON public.job_queue (queue_name, run_at, priority DESC, created_at)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_job_queue_type_status_run_at
  ON public.job_queue (job_type, status, run_at);

CREATE INDEX IF NOT EXISTS idx_job_queue_source
  ON public.job_queue (source_table, source_id);

CREATE INDEX IF NOT EXISTS idx_job_queue_processing_lease
  ON public.job_queue (lease_until)
  WHERE status = 'processing';

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_queue_dedupe_active
  ON public.job_queue (dedupe_key)
  WHERE dedupe_key IS NOT NULL
    AND status IN ('pending', 'processing');

ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_queue_service_all" ON public.job_queue;
CREATE POLICY "job_queue_service_all" ON public.job_queue
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS job_queue_set_updated_at ON public.job_queue;
CREATE TRIGGER job_queue_set_updated_at
  BEFORE UPDATE ON public.job_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.claim_jobs(
  p_worker_id TEXT,
  p_limit INTEGER DEFAULT 10,
  p_queue_name TEXT DEFAULT NULL,
  p_lease_seconds INTEGER DEFAULT 300
)
RETURNS SETOF public.job_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_queue_name TEXT := NULLIF(BTRIM(p_queue_name), '');
BEGIN
  IF NULLIF(BTRIM(p_worker_id), '') IS NULL THEN
    RAISE EXCEPTION 'p_worker_id is required';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 100';
  END IF;

  IF p_lease_seconds IS NULL OR p_lease_seconds < 30 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'p_lease_seconds must be between 30 and 3600';
  END IF;

  UPDATE public.job_queue
     SET status = 'dead',
         locked_by = NULL,
         locked_at = NULL,
         lease_until = NULL,
         last_error = COALESCE(last_error, 'Max attempts exceeded'),
         last_error_at = COALESCE(last_error_at, now()),
         updated_at = now()
   WHERE status IN ('pending', 'processing')
     AND attempts >= max_attempts
     AND (status <> 'processing' OR lease_until IS NULL OR lease_until < now());

  RETURN QUERY
  WITH picked AS (
    SELECT j.id
    FROM public.job_queue AS j
    WHERE j.run_at <= now()
      AND j.attempts < j.max_attempts
      AND (v_queue_name IS NULL OR j.queue_name = v_queue_name)
      AND (
        j.status = 'pending'
        OR (
          j.status = 'processing'
          AND (j.lease_until IS NULL OR j.lease_until < now())
        )
      )
    ORDER BY j.priority DESC, j.run_at ASC, j.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.job_queue AS j
     SET status = 'processing',
         attempts = j.attempts + 1,
         locked_by = p_worker_id,
         locked_at = now(),
         lease_until = now() + make_interval(secs => p_lease_seconds),
         updated_at = now()
    FROM picked AS p
   WHERE j.id = p.id
   RETURNING j.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_jobs(TEXT, INTEGER, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_jobs(TEXT, INTEGER, TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION public.claim_jobs(TEXT, INTEGER, TEXT, INTEGER) IS
  'Atomically leases due jobs from job_queue for a worker instance.';

-- =============================================================
-- 028_max_crosspost_tracking.sql
-- =============================================================

-- Migration 028: track which paid orders have been crossposted to MAX channel
-- 2026-04-30

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS max_crossposted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.max_crossposted_at IS
  'Set when this order has been crossposted to the MAX channel. NULL = not yet posted.';

CREATE INDEX IF NOT EXISTS idx_orders_max_crosspost
  ON public.orders (status, max_crossposted_at)
  WHERE status = 'paid' AND max_crossposted_at IS NULL;

-- =============================================================
-- 029_job_queue_maintenance.sql
-- =============================================================

-- Migration 029: job_queue maintenance — auto-cleanup + stats function
-- 2026-04-30
--
-- Problems solved:
-- 1. Completed / dead jobs accumulate indefinitely → table bloat, slow index scans
-- 2. No way to query queue health from application code for monitoring
--
-- Solution:
-- A. cleanup_job_queue(retention_days) — deletes old completed/dead rows,
--    returns count deleted. Called nightly by the analytics cron via job-queue.
-- B. get_job_queue_stats() — returns counts by status for health monitoring.
--    Used by /api/health and the dead-job alert in analytics.daily_admin_report.

-- ─────────────────────────────────────────────────────────────────────────────
-- A. Cleanup function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_job_queue(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted INTEGER;
BEGIN
  DELETE FROM public.job_queue
  WHERE status IN ('completed', 'dead', 'cancelled')
    AND updated_at < now() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_job_queue(INTEGER) IS
  'Deletes completed/dead/cancelled job_queue rows older than retention_days (default 30).
   Returns the number of deleted rows. Safe to call multiple times (idempotent).';

-- ─────────────────────────────────────────────────────────────────────────────
-- B. Stats function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_job_queue_stats()
RETURNS TABLE(
  status        TEXT,
  cnt           BIGINT,
  oldest_run_at TIMESTAMPTZ,
  newest_run_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    jq.status,
    COUNT(*)                   AS cnt,
    MIN(jq.run_at)             AS oldest_run_at,
    MAX(jq.run_at)             AS newest_run_at
  FROM public.job_queue jq
  GROUP BY jq.status
  ORDER BY jq.status;
$$;

COMMENT ON FUNCTION public.get_job_queue_stats() IS
  'Returns per-status row counts and run_at range for the job_queue table.
   Used by /api/health and the nightly analytics report.';

-- Grant EXECUTE to service_role (PostgREST RPC callers)
GRANT EXECUTE ON FUNCTION public.cleanup_job_queue(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_job_queue_stats()       TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- C. Partial index to speed up cleanup query (optional, belt-and-suspenders)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_job_queue_cleanup
  ON public.job_queue (updated_at)
  WHERE status IN ('completed', 'dead', 'cancelled');

-- =============================================================
-- 030_payment_gateway_scaffold.sql
-- =============================================================

-- Migration 030: Payment gateway scaffold
-- 2026-04-30
--
-- Adds three columns to orders to support a future payment gateway
-- (Tinkoff / YooKassa / CloudPayments) without breaking the current
-- manual flow.  All columns default to NULL — existing records are
-- unaffected.
--
-- Column semantics:
--   payment_gateway          — which provider was used ('tinkoff' | 'yookassa' | 'cloudpayments')
--   payment_gateway_order_id — provider's internal payment/order ID (for webhook verification)
--   payment_gateway_url      — redirect URL sent to the customer for online payment
--   payment_confirmed_at     — timestamp set by the gateway webhook (vs manual admin action)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_gateway           TEXT
    CHECK (payment_gateway IS NULL OR payment_gateway IN ('tinkoff', 'yookassa', 'cloudpayments', 'manual')),
  ADD COLUMN IF NOT EXISTS payment_gateway_order_id  TEXT,
  ADD COLUMN IF NOT EXISTS payment_gateway_url       TEXT,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at      TIMESTAMPTZ;

-- Index for webhook look-ups (gateway posts order_id in the body)
CREATE INDEX IF NOT EXISTS idx_orders_gateway_order_id
  ON public.orders (payment_gateway_order_id)
  WHERE payment_gateway_order_id IS NOT NULL;

COMMENT ON COLUMN public.orders.payment_gateway IS
  'Payment provider used for this order. NULL = manual SBP/bank-transfer flow.';
COMMENT ON COLUMN public.orders.payment_gateway_order_id IS
  'Provider-assigned payment ID for webhook signature verification.';
COMMENT ON COLUMN public.orders.payment_gateway_url IS
  'Hosted payment page URL returned by the provider after session creation.';
COMMENT ON COLUMN public.orders.payment_confirmed_at IS
  'Timestamp when the gateway webhook confirmed successful payment.
   Distinct from payment_paid_at which is set by admin in the manual flow.';

-- =============================================================
-- 031_security_hardening.sql
-- =============================================================

-- ============================================================================
-- 031_security_hardening.sql
-- Session revoke-list, admin multi-user, admin audit-log
-- ============================================================================

-- ── REVOKED SESSIONS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS revoked_sessions (
  jti_hash   TEXT PRIMARY KEY,          -- SHA-256(first 64 chars of session token)
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL       -- auto-cleanup after this time
);

CREATE INDEX IF NOT EXISTS idx_revoked_expires ON revoked_sessions(expires_at);

-- Auto-clean expired revocations (PG_CRON or manual VACUUM)
-- Run periodically: DELETE FROM revoked_sessions WHERE expires_at < now();

-- ── ADMIN USERS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_users (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username     TEXT NOT NULL UNIQUE,
  pin_hash     TEXT NOT NULL,           -- scrypt hash (same format as users.password_hash)
  role         TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  last_login   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: only service_role
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_users_service_all" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- ── ADMIN AUDIT LOG ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id       TEXT,                   -- admin user id (or 'pin' for legacy env var)
  admin_username TEXT,                   -- admin username (or null for legacy)
  action         TEXT NOT NULL,          -- HTTP method + path (e.g. 'PUT /api/admin/orders/...')
  endpoint       TEXT NOT NULL,          -- full pathname
  ip_address     TEXT,                   -- client IP
  user_agent     TEXT,                   -- User-Agent header (truncated)
  details        JSONB DEFAULT '{}',     -- extra metadata
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_service_all" ON admin_audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- ── EXTEND orders.status constraint to include newer statuses ────────────────
-- (existing constraint only allows old statuses; migration 023 fixed it partially)
-- This is a no-op if already applied, but ensures correctness.

DO $$
BEGIN
  -- Drop old check constraint if it exists (idempotent)
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
  ALTER TABLE orders ADD CONSTRAINT orders_status_check
    CHECK (status IN (
      'pending', 'priced', 'payment_sent', 'paid',
      'in_progress', 'confirming', 'completed',
      'disputed', 'cancelled', 'published', 'closed', 'done'
    ));
EXCEPTION WHEN duplicate_object THEN
  -- constraint already exists, skip
END $$;

