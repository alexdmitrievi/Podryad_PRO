-- 044: CRM Unification — extend bot_leads for landing-page & legacy CRM fields
-- 2026-05-10
--
-- Добавляет недостающие поля из crm_lead_funnel в bot_leads
-- для единой CRM-системы (бот + лендинг)

-- Добавляем 'general' в enum для лендинг-лидов (без явного service_kind)
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM pg_enum
   WHERE enumtypid = 'bot_service_kind'::regtype AND enumlabel = 'general';
  IF v_count = 0 THEN
    ALTER TYPE bot_service_kind ADD VALUE 'general';
  END IF;
END $$;

-- Расширяем bot_leads полями из legacy crm_lead_funnel
ALTER TABLE public.bot_leads
  ADD COLUMN IF NOT EXISTS name                  TEXT,
  ADD COLUMN IF NOT EXISTS email                 TEXT,
  ADD COLUMN IF NOT EXISTS messenger             TEXT,
  ADD COLUMN IF NOT EXISTS telegram              TEXT,
  ADD COLUMN IF NOT EXISTS comment               TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes           TEXT,
  ADD COLUMN IF NOT EXISTS conversation_summary  TEXT,
  ADD COLUMN IF NOT EXISTS source                TEXT NOT NULL DEFAULT 'bot',
  ADD COLUMN IF NOT EXISTS contact_attempts      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_contacted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_followup_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_at          TIMESTAMPTZ;

COMMENT ON COLUMN public.bot_leads.name IS 'Имя человека (из лендинга или бота)';
COMMENT ON COLUMN public.bot_leads.source IS 'Источник лида: bot, landing, avito, manual, referral';
COMMENT ON COLUMN public.bot_leads.contact_attempts IS 'Количество попыток связаться';
COMMENT ON COLUMN public.bot_leads.next_followup_at IS 'Когда следующий фоллоу-ап';
COMMENT ON COLUMN public.bot_leads.converted_at IS 'Когда лид сконвертирован в заказ';

-- Индексы для CRM-воронки
CREATE INDEX IF NOT EXISTS idx_bot_leads_source ON public.bot_leads(source);
CREATE INDEX IF NOT EXISTS idx_bot_leads_next_followup ON public.bot_leads(next_followup_at)
  WHERE next_followup_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bot_leads_stage_followup ON public.bot_leads(status, next_followup_at ASC NULLS FIRST)
  WHERE next_followup_at IS NOT NULL;
