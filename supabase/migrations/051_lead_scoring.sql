-- =============================================================================
-- Migration 051: Lead scoring — priority scoring for inbound leads
-- =============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS score INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.leads.score IS 'Приоритет лида: +20 повторный клиент, +10 полный адрес, +15 юрлицо. Сортировка по убыванию.';

CREATE INDEX IF NOT EXISTS idx_leads_score ON public.leads(score DESC, created_at DESC);
