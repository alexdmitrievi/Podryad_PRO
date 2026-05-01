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
