-- Migration 055: B2B platform pivot — add a 'general' service to bot_services
-- so bot_leads for digital/labor services (marketing, AI, CRM, automation,
-- agency, tender parser, scraping, workforce) can reference a valid service_id.
-- The specific service kind is stored in bot_leads.metadata + description.

INSERT INTO public.bot_services (kind, name, short_name, description, is_active, sort_order, work_type_map)
VALUES (
  'general',
  'Общая заявка (B2B)',
  'Заявка',
  'Заявка без фиксированной услуги: маркетинг, ИИ-агенты, CRM, автоматизация, агентские, парсер тендеров, скрапинг, рабочая сила',
  true,
  100,
  NULL
)
ON CONFLICT (kind) DO NOTHING;
