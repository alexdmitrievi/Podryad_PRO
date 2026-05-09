-- =============================================================================
-- Migration 038: Campaigns + events log
-- Интеграция Premium → Подряд PRO
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Таблица: campaigns — маркетинговые кампании рассылок
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  channel       messenger_channel,
  service_kind  bot_service_kind,
  segment_sql   TEXT,
  message_text  TEXT NOT NULL,
  buttons       JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT false,
  scheduled_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.campaigns IS 'Кампании рассылок. n8n cron-воркфлоу читает is_active=true.';

DROP TRIGGER IF EXISTS set_updated_at ON public.campaigns;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Таблица: campaign_recipients — кому отправлено
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id   UUID NOT NULL REFERENCES public.bot_contacts(id) ON DELETE CASCADE,
  channel      messenger_channel NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error        TEXT,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, contact_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_cr_status ON public.campaign_recipients(campaign_id, status);

-- ---------------------------------------------------------------------------
-- Таблица: events — бизнес-события для аналитики и триггеров
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id            BIGSERIAL PRIMARY KEY,
  type          TEXT NOT NULL,
  contact_id    UUID REFERENCES public.bot_contacts(id) ON DELETE SET NULL,
  lead_id       UUID REFERENCES public.bot_leads(id) ON DELETE SET NULL,
  channel       messenger_channel,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_contact ON public.events(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_lead ON public.events(lead_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_service_all" ON public.campaigns
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "campaign_recipients_service_all" ON public.campaign_recipients
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "events_service_all" ON public.events
  FOR ALL USING (auth.role() = 'service_role');
