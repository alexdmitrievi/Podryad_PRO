-- =============================================================================
-- Migration 033: Bot core infrastructure (sessions, webhook inbox, app logs)
-- Интеграция Premium → Подряд PRO
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Расширения (pgcrypto уже есть в проекте, на всякий случай)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- ENUM: messenger_channel
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE messenger_channel AS ENUM ('telegram', 'max', 'whatsapp', 'offline', 'phone', 'avito');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- ENUM: bot_lead_status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE bot_lead_status AS ENUM (
    'new',
    'qualifying',
    'qualified',
    'quoted',
    'scheduled',
    'in_progress',
    'done',
    'lost',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- ENUM: message_direction
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- ENUM: message_kind
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE message_kind AS ENUM ('text', 'photo', 'video', 'document', 'voice', 'location', 'contact', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- ENUM: referral_status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE referral_status AS ENUM ('pending', 'qualified', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Таблица: bot_sessions — состояние диалога воронки
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bot_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id       TEXT NOT NULL,
  channel       messenger_channel NOT NULL,
  contact_id    UUID,
  funnel        TEXT NOT NULL DEFAULT '',
  step          TEXT NOT NULL DEFAULT 'start',
  state         JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chat_id, channel)
);

COMMENT ON TABLE public.bot_sessions IS 'Текущий шаг воронки для пользователя. Один chat_id + channel = одна активная сессия.';

CREATE INDEX IF NOT EXISTS idx_bot_sessions_funnel ON public.bot_sessions(funnel, step);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_expires ON public.bot_sessions(expires_at);

DROP TRIGGER IF EXISTS set_updated_at ON public.bot_sessions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.bot_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Таблица: webhook_inbox — лог входящих апдейтов (идемпотентность)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_inbox (
  id           BIGSERIAL PRIMARY KEY,
  channel      messenger_channel NOT NULL,
  external_id  TEXT NOT NULL,
  payload      JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  error        TEXT,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel, external_id)
);

COMMENT ON TABLE public.webhook_inbox IS 'Все входящие вебхуки. UNIQUE(channel, external_id) защищает от двойной обработки.';

CREATE INDEX IF NOT EXISTS idx_webhook_inbox_unprocessed
  ON public.webhook_inbox(channel, received_at)
  WHERE processed_at IS NULL;

-- ---------------------------------------------------------------------------
-- Таблица: app_logs — структурированные логи приложения
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_logs (
  id          BIGSERIAL PRIMARY KEY,
  level       TEXT NOT NULL,
  source      TEXT NOT NULL,
  message     TEXT NOT NULL,
  context     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_logs_level ON public.app_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_source ON public.app_logs(source, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS (базовое — затянем в 040 после всех таблиц)
-- ---------------------------------------------------------------------------
ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bot_sessions_service_all" ON public.bot_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "webhook_inbox_service_all" ON public.webhook_inbox
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "app_logs_service_all" ON public.app_logs
  FOR ALL USING (auth.role() = 'service_role');
