-- =============================================================================
-- Migration 056: Autoclient — единая схема автономного поиска клиентов
-- =============================================================================
-- Два сервиса, одна БД: Python-сервис (Parser) пишет компании/контакты/ЛПР,
-- Next.js-сервис (Podryad PRO) ведёт CRM-воронку, рассылку, чаты, аналитику.
--
-- ЗАВИСИМОСТЬ: в этой же БД должны существовать таблицы leads_companies и
-- leads_emails (миграция Parser: scripts/migration_leads.sql). Если их нет —
-- выполните сначала её, либо создайте таблицы ниже вручную.
--
-- Миграция ИДЕМПОТЕНТНА: повторный запуск не ломает и не теряет данные.
-- =============================================================================

-- ────────────────────────── 1. ЛПР (decision makers) ─────────────────────────
CREATE TABLE IF NOT EXISTS decision_makers (
    id             bigserial PRIMARY KEY,
    company_id     bigint      NOT NULL REFERENCES leads_companies (id) ON DELETE CASCADE,
    name           text        NOT NULL DEFAULT '',
    role           text        NOT NULL DEFAULT '',
    contact_type   text        NOT NULL DEFAULT 'email',  -- email|telegram|whatsapp|wechat|vk
    contact_value  text        NOT NULL DEFAULT '',
    source         text        NOT NULL DEFAULT '',
    created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_decision_makers_company ON decision_makers (company_id);

-- ────────────────────────── 2. CRM-лиды (воронка) ───────────────────────────
-- Карточка лида — компания, вошедшая в воронку. Движется по статусам.
CREATE TABLE IF NOT EXISTS crm_leads (
    id          bigserial   PRIMARY KEY,
    company_id  bigint      NOT NULL REFERENCES leads_companies (id) ON DELETE CASCADE,
    niche       text        NOT NULL DEFAULT '',
    status      text        NOT NULL DEFAULT 'new',
    -- status ∈ new | analyzed | cp_drafted | cp_approved | sent | replied | call | won | lost
    channel     text        NOT NULL DEFAULT '',   -- email|telegram|whatsapp|vk|max|wechat
    assigned_to uuid,                              -- auth.users.id (owner/client/manager)
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads (status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_company ON crm_leads (company_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned ON crm_leads (assigned_to);

-- ────────────────────────── 3. Задачи рассылки ──────────────────────────────
-- draft → approved (владелец нажал «ОК») → sent / failed / skipped
CREATE TABLE IF NOT EXISTS outreach_tasks (
    id           bigserial   PRIMARY KEY,
    lead_id      bigint      NOT NULL REFERENCES crm_leads (id) ON DELETE CASCADE,
    channel      text        NOT NULL,
    status       text        NOT NULL DEFAULT 'draft',
    subject      text        NOT NULL DEFAULT '',
    body         text        NOT NULL DEFAULT '',
    to_address   text        NOT NULL DEFAULT '',
    approved_by  uuid,
    scheduled_at timestamptz,
    sent_at      timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_status ON outreach_tasks (status);
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_lead   ON outreach_tasks (lead_id);

-- ────────────────────────── 4. Переписка (two-way) ──────────────────────────
CREATE TABLE IF NOT EXISTS lead_messages (
    id         bigserial   PRIMARY KEY,
    lead_id    bigint      NOT NULL REFERENCES crm_leads (id) ON DELETE CASCADE,
    channel    text        NOT NULL,
    direction  text        NOT NULL,   -- in | out
    text       text        NOT NULL,
    status     text        NOT NULL DEFAULT 'sent',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_messages_lead ON lead_messages (lead_id, created_at DESC);

-- ────────────────────────── 5. Сигналы из чатов (TG/VK) ─────────────────────
CREATE TABLE IF NOT EXISTS chat_signals (
    id            bigserial   PRIMARY KEY,
    platform      text        NOT NULL,   -- telegram | vk
    chat_name     text        NOT NULL DEFAULT '',
    author        text        NOT NULL DEFAULT '',
    message_text  text        NOT NULL,
    warmth_score  real        NOT NULL DEFAULT 0,
    status        text        NOT NULL DEFAULT 'new',  -- new | matched | contacted | ignored
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_signals_status ON chat_signals (status);
CREATE INDEX IF NOT EXISTS idx_chat_signals_platform ON chat_signals (platform);

-- ────────────────────────── 6. AI-задачи (DeepSeek) ─────────────────────────
CREATE TABLE IF NOT EXISTS ai_tasks (
    id         bigserial   PRIMARY KEY,
    company_id bigint      REFERENCES leads_companies (id) ON DELETE SET NULL,
    lead_id    bigint      REFERENCES crm_leads (id) ON DELETE SET NULL,
    task_type  text        NOT NULL,   -- analyze | cp_generate | reply | warmth
    input      text        NOT NULL DEFAULT '',
    output     text        NOT NULL DEFAULT '',
    model      text        NOT NULL DEFAULT 'deepseek-chat',
    tokens     integer     NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_company ON ai_tasks (company_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_type    ON ai_tasks (task_type);

-- ────────────────────────── 7. Роли/доступы CRM ─────────────────────────────
-- owner — владелец; client — заказчик (видит своих лидов); manager — менеджер
-- заказчика (привязан к client_id). Мультитенант через assigned_to на crm_leads.
CREATE TABLE IF NOT EXISTS crm_members (
    id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    role      text        NOT NULL DEFAULT 'manager',   -- owner | client | manager
    client_id uuid,                                     -- для client/manager: чей это клиент
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_members_user ON crm_members (user_id);

-- ────────────────────────── RLS ─────────────────────────────────────────────
-- Внутренние таблицы: доступ только через service_role (RLS обходится).
-- Доступ владельца/заказчиков/менеджеров к своим лидам реализуется на уровне
-- API-роутов через crm_members (не через публичные RLS-политики).

ALTER TABLE decision_makers ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_signals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_members    ENABLE ROW LEVEL SECURITY;

-- ────────────────────────── Аналитика (RPC) ─────────────────────────────────
-- Воронка по статусам + разрез по нише/каналу/гео — считаем в БД, не в коде.
CREATE OR REPLACE FUNCTION get_crm_funnel()
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'by_status', coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
  )
  FROM (SELECT status, count(*) n FROM crm_leads GROUP BY status) t;
$$;
