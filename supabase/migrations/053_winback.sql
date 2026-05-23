-- =============================================================================
-- Migration 053: Winback campaigns — tracking sent winback messages
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.winback_log (
  id              BIGSERIAL PRIMARY KEY,
  contact_id      UUID NOT NULL,
  campaign_type   TEXT NOT NULL,  -- '30d' | '60d' | '90d'
  channel         messenger_channel NOT NULL DEFAULT 'telegram',
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.winback_log IS 'Лог отправленных winback-сообщений. UNIQUE на (contact_id, campaign_type) для предотвращения дублей.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_winback_dedupe ON public.winback_log(contact_id, campaign_type);

ALTER TABLE public.winback_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "winback_log_service_all" ON public.winback_log
  FOR ALL USING (auth.role() = 'service_role');
