-- =============================================================================
-- Migration 052: UTM tracking — source attribution for leads
-- =============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

COMMENT ON COLUMN public.leads.utm_source   IS 'UTM-метка источника (google, yandex, vk, etc.)';
COMMENT ON COLUMN public.leads.utm_medium   IS 'UTM-метка канала (cpc, cpm, organic, etc.)';
COMMENT ON COLUMN public.leads.utm_campaign IS 'UTM-метка кампании';
