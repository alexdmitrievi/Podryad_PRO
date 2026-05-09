-- =============================================================================
-- Migration 035: Bot services catalog + bot leads + messages
-- Интеграция Premium → Подряд PRO
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUM: bot_service_kind — услуги бота
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE bot_service_kind AS ENUM (
    'lawn_mowing',
    'scarification',
    'aeration',
    'land_clearing',
    'tree_cutting',
    'stump_removal',
    'debris_removal',
    'pool_cleaning',
    'pool_assembly',
    'weed_removal',
    'pool_maintenance',
    'welding',
    'tilling',
    'subscription'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Таблица: bot_services — справочник услуг для ботов
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bot_services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            bot_service_kind NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  short_name      TEXT NOT NULL,
  description     TEXT,
  unit            TEXT,
  price_min       NUMERIC(12,2),
  price_max       NUMERIC(12,2),
  season_months   INT[] DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INT NOT NULL DEFAULT 0,
  work_type_map   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bot_services IS 'Справочник услуг для ботов. work_type_map — связь с work_type в таблице orders.';
COMMENT ON COLUMN public.bot_services.season_months IS 'Месяцы сезона (1..12), для триггерных рассылок.';

DROP TRIGGER IF EXISTS set_updated_at ON public.bot_services;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.bot_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Таблица: bot_leads — заявки из ботовой воронки
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bot_leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id            UUID NOT NULL REFERENCES public.bot_contacts(id) ON DELETE CASCADE,
  service_id            UUID NOT NULL REFERENCES public.bot_services(id),
  service_kind          bot_service_kind NOT NULL,
  source_id             UUID REFERENCES public.traffic_sources(id) ON DELETE SET NULL,
  channel               messenger_channel NOT NULL,
  status                bot_lead_status NOT NULL DEFAULT 'new',
  area_value            NUMERIC(12,2),
  area_unit             TEXT,
  description           TEXT,
  city                  TEXT DEFAULT 'Омск',
  district              TEXT,
  address               TEXT,
  desired_date_from     DATE,
  desired_date_to       DATE,
  scheduled_at          TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  price_quoted          NUMERIC(12,2),
  price_final           NUMERIC(12,2),
  currency              TEXT NOT NULL DEFAULT 'RUB',
  discount_percent      INT NOT NULL DEFAULT 0,
  discount_rub          INT NOT NULL DEFAULT 0,
  repeat_of             UUID REFERENCES public.bot_leads(id) ON DELETE SET NULL,
  referral_id           UUID,
  order_id              TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_activity_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

COMMENT ON TABLE public.bot_leads IS 'Заявки из ботовой воронки. order_id — связь с таблицей orders при конвертации.';
COMMENT ON COLUMN public.bot_leads.order_id IS 'ID заказа в таблице orders после конвертации лида в заказ.';

-- FK от bot_lead_tags к bot_leads
ALTER TABLE public.bot_lead_tags
  DROP CONSTRAINT IF EXISTS bot_lead_tags_lead_fk;
ALTER TABLE public.bot_lead_tags
  ADD CONSTRAINT bot_lead_tags_lead_fk FOREIGN KEY (lead_id) REFERENCES public.bot_leads(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bot_leads_contact ON public.bot_leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_bot_leads_service ON public.bot_leads(service_id);
CREATE INDEX IF NOT EXISTS idx_bot_leads_kind ON public.bot_leads(service_kind);
CREATE INDEX IF NOT EXISTS idx_bot_leads_status ON public.bot_leads(status);
CREATE INDEX IF NOT EXISTS idx_bot_leads_channel ON public.bot_leads(channel);
CREATE INDEX IF NOT EXISTS idx_bot_leads_order ON public.bot_leads(order_id);
CREATE INDEX IF NOT EXISTS idx_bot_leads_activity ON public.bot_leads(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_leads_completed ON public.bot_leads(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bot_leads_deleted ON public.bot_leads(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bot_leads_repeat ON public.bot_leads(repeat_of);

DROP TRIGGER IF EXISTS set_updated_at ON public.bot_leads;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.bot_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Таблица: lead_media — фото/видео объектов
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_media (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID NOT NULL REFERENCES public.bot_leads(id) ON DELETE CASCADE,
  kind         message_kind NOT NULL DEFAULT 'photo',
  storage_path TEXT,
  external_url TEXT,
  width        INT,
  height       INT,
  size_bytes   BIGINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_media_lead ON public.lead_media(lead_id);

-- ---------------------------------------------------------------------------
-- Таблица: bot_messages — переписка по всем каналам
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bot_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      UUID REFERENCES public.bot_contacts(id) ON DELETE SET NULL,
  lead_id         UUID REFERENCES public.bot_leads(id) ON DELETE SET NULL,
  channel         messenger_channel NOT NULL,
  direction       message_direction NOT NULL,
  kind            message_kind NOT NULL DEFAULT 'text',
  external_id     TEXT,
  text            TEXT,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bot_messages IS 'Архив всех сообщений (входящие и исходящие) из ботов.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_bot_messages_external
  ON public.bot_messages(channel, direction, external_id)
  WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bot_messages_contact ON public.bot_messages(contact_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_messages_lead ON public.bot_messages(lead_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_messages_channel ON public.bot_messages(channel, sent_at DESC);

-- ---------------------------------------------------------------------------
-- Триггер: обновление last_activity_at у bot_leads по входящим сообщениям
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_bump_bot_lead_activity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF new.lead_id IS NOT NULL THEN
    UPDATE public.bot_leads
       SET last_activity_at = new.sent_at
     WHERE id = new.lead_id AND last_activity_at < new.sent_at;
  END IF;
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS bump_bot_lead_activity ON public.bot_messages;
CREATE TRIGGER bump_bot_lead_activity
  AFTER INSERT ON public.bot_messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_bot_lead_activity();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.bot_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bot_services_service_all" ON public.bot_services
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "bot_leads_service_all" ON public.bot_leads
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "lead_media_service_all" ON public.lead_media
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "bot_messages_service_all" ON public.bot_messages
  FOR ALL USING (auth.role() = 'service_role');

-- Публичный read для справочника услуг
DROP POLICY IF EXISTS "anon read bot_services" ON public.bot_services;
CREATE POLICY "anon read bot_services" ON public.bot_services
  FOR SELECT USING (is_active = true);
