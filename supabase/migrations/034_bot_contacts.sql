-- =============================================================================
-- Migration 034: Bot contacts, identities, traffic sources, tags
-- Интеграция Premium → Подряд PRO
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Таблица: traffic_sources — каналы привлечения трафика
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.traffic_sources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  channel       messenger_channel,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.traffic_sources IS 'Каналы привлечения трафика (Avito, Telegram, MAX-бот и т.п.).';

DROP TRIGGER IF EXISTS set_updated_at ON public.traffic_sources;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.traffic_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Таблица: bot_contacts — клиенты (бота)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bot_contacts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name             TEXT,
  phone                 TEXT,
  phone_normalized      TEXT GENERATED ALWAYS AS (regexp_replace(COALESCE(phone, ''), '[^0-9+]', '', 'g')) STORED,
  email                 CITEXT,
  city                  TEXT DEFAULT 'Омск',
  district              TEXT,
  address               TEXT,
  geo_lat               NUMERIC(10,7),
  geo_lon               NUMERIC(10,7),
  preferred_channel     messenger_channel,
  language              TEXT NOT NULL DEFAULT 'ru',
  consent_marketing     BOOLEAN NOT NULL DEFAULT false,
  consent_marketing_at  TIMESTAMPTZ,
  unsubscribed          BOOLEAN NOT NULL DEFAULT false,
  unsubscribed_at       TIMESTAMPTZ,
  notes                 TEXT,
  loyalty_tier          TEXT NOT NULL DEFAULT 'standard',
  total_orders          INT NOT NULL DEFAULT 0,
  last_order_at         TIMESTAMPTZ,
  source_id             UUID REFERENCES public.traffic_sources(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

COMMENT ON TABLE public.bot_contacts IS 'Контакты (клиенты) — единая запись на человека во всех каналах.';
COMMENT ON COLUMN public.bot_contacts.loyalty_tier IS 'Тариф лояльности (standard, vip, partner).';
COMMENT ON COLUMN public.bot_contacts.total_orders IS 'Кол-во выполненных заказов. Обновляется триггером.';
COMMENT ON COLUMN public.bot_contacts.unsubscribed IS 'Флаг отписки. true = НЕ слать рассылки ни в один канал.';

CREATE INDEX IF NOT EXISTS idx_bot_contacts_phone ON public.bot_contacts(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_bot_contacts_email ON public.bot_contacts(email);
CREATE INDEX IF NOT EXISTS idx_bot_contacts_city ON public.bot_contacts(city);
CREATE INDEX IF NOT EXISTS idx_bot_contacts_unsub ON public.bot_contacts(unsubscribed) WHERE unsubscribed = false;
CREATE INDEX IF NOT EXISTS idx_bot_contacts_deleted ON public.bot_contacts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bot_contacts_name_trgm ON public.bot_contacts USING GIN (full_name gin_trgm_ops);

DROP TRIGGER IF EXISTS set_updated_at ON public.bot_contacts;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.bot_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Таблица: bot_contact_identities — связи контакта с каналами
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bot_contact_identities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id    UUID NOT NULL REFERENCES public.bot_contacts(id) ON DELETE CASCADE,
  channel       messenger_channel NOT NULL,
  external_id   TEXT NOT NULL,
  username      TEXT,
  display_name  TEXT,
  is_blocked    BOOLEAN NOT NULL DEFAULT false,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel, external_id)
);

COMMENT ON TABLE public.bot_contact_identities IS 'Идентификаторы контакта в каждом канале (telegram_id, max_id и т.д.).';

CREATE INDEX IF NOT EXISTS idx_bci_contact ON public.bot_contact_identities(contact_id);
CREATE INDEX IF NOT EXISTS idx_bci_channel ON public.bot_contact_identities(channel);

DROP TRIGGER IF EXISTS set_updated_at ON public.bot_contact_identities;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.bot_contact_identities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Таблица: tags — справочник тегов
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  color         TEXT,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tags IS 'Справочник тегов для сегментации клиентов и рассылок.';

-- ---------------------------------------------------------------------------
-- Таблица: bot_contact_tags — связь контактов с тегами
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bot_contact_tags (
  contact_id  UUID NOT NULL REFERENCES public.bot_contacts(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_bct_tag ON public.bot_contact_tags(tag_id);

-- ---------------------------------------------------------------------------
-- Таблица: bot_lead_tags — связь лидов с тегами (FK на leads добавим в 036)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bot_lead_tags (
  lead_id    UUID NOT NULL,
  tag_id     UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (lead_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blt_tag ON public.bot_lead_tags(tag_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.traffic_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_contact_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "traffic_sources_service_all" ON public.traffic_sources
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "bot_contacts_service_all" ON public.bot_contacts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "bci_service_all" ON public.bot_contact_identities
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "tags_service_all" ON public.tags
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "bot_contact_tags_service_all" ON public.bot_contact_tags
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "bot_lead_tags_service_all" ON public.bot_lead_tags
  FOR ALL USING (auth.role() = 'service_role');

-- Публичный read для справочника тегов (для потенциального UI)
DROP POLICY IF EXISTS "anon read tags" ON public.tags;
CREATE POLICY "anon read tags" ON public.tags
  FOR SELECT USING (true);
