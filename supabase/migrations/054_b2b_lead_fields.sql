-- Migration 054: B2B platform pivot — universal lead form fields
-- Adds company (legal name for B2B leads) and commission_percent (lead-gen model:
-- lead -> КП -> комиссия/агентский %). Both nullable; filled by the manager.

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2);
