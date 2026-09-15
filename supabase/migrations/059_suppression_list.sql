-- =============================================================================
-- Migration 059: CRM stop-list + lead admin notes
-- =============================================================================
-- Глобальный suppression list (email/TG/MAX/WhatsApp/...) — единый opt-out/стоп-лист
-- для всех каналов аутрича. Проверяется перед любой отправкой.
-- Плюс admin_notes для карточки CRM-лида в админке.
-- =============================================================================

CREATE TABLE IF NOT EXISTS suppression_list (
    id          bigserial   PRIMARY KEY,
    channel     text        NOT NULL,          -- email|telegram|max|whatsapp|phone|any
    identifier  text        NOT NULL,          -- email / tg id / username / phone
    reason      text        NOT NULL DEFAULT '',
    source      text        NOT NULL DEFAULT 'manual',  -- manual | bounce | user_optout
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (channel, identifier)
);
CREATE INDEX IF NOT EXISTS idx_suppression_channel ON suppression_list (channel);
ALTER TABLE suppression_list ENABLE ROW LEVEL SECURITY;

ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS admin_notes text NOT NULL DEFAULT '';
