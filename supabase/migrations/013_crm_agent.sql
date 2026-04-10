-- Migration 013: CRM Agent Tables
-- Воронка продаж для заказчиков и агент по привлечению исполнителей с Авито
-- 2026-04-10

-- ── 1. CRM LEAD FUNNEL (воронка заказчиков) ──

CREATE TABLE IF NOT EXISTS crm_lead_funnel (
  id              BIGSERIAL PRIMARY KEY,
  lead_id         BIGINT REFERENCES leads(id) ON DELETE CASCADE,
  phone           TEXT NOT NULL,
  name            TEXT,
  work_type       TEXT,
  city            TEXT,
  messenger       TEXT,   -- 'max' | 'telegram' | 'email' | 'phone'
  email           TEXT,
  telegram        TEXT,

  -- Воронка
  stage           TEXT NOT NULL DEFAULT 'new'
                    CHECK (stage IN (
                      'new',           -- Новая заявка
                      'contacted',     -- Первое сообщение отправлено
                      'engaged',       -- Есть ответ / взаимодействие
                      'link_sent',     -- Ссылка на дашборд отправлена
                      'converted',     -- Заказ создан
                      'cold',          -- Не ответил / потерян
                      'lost'           -- Явно отказался
                    )),

  -- Автоматизация
  contact_attempts  INTEGER NOT NULL DEFAULT 0,
  last_contacted_at TIMESTAMPTZ,
  next_followup_at  TIMESTAMPTZ,
  converted_at      TIMESTAMPTZ,
  order_id          TEXT,             -- ID созданного заказа если конвертировался

  -- Заметки
  admin_notes       TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_lead_funnel_phone ON crm_lead_funnel(phone);
CREATE INDEX IF NOT EXISTS idx_crm_lead_funnel_stage ON crm_lead_funnel(stage);
CREATE INDEX IF NOT EXISTS idx_crm_lead_funnel_next_followup ON crm_lead_funnel(next_followup_at);
CREATE INDEX IF NOT EXISTS idx_crm_lead_funnel_lead_id ON crm_lead_funnel(lead_id);

-- ── 2. CRM EXECUTOR PROSPECTS (потенциальные исполнители с Авито) ──

CREATE TABLE IF NOT EXISTS crm_executor_prospects (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT NOT NULL DEFAULT '',
  phone            TEXT,
  city             TEXT NOT NULL DEFAULT 'omsk',
  specialties      TEXT[] NOT NULL DEFAULT '{}',
  source           TEXT NOT NULL DEFAULT 'avito'
                     CHECK (source IN ('avito', 'manual', 'referral', 'vk', 'other')),

  -- Авито-данные
  avito_profile_url TEXT,
  avito_user_id     TEXT,

  -- Воронка
  stage            TEXT NOT NULL DEFAULT 'new'
                     CHECK (stage IN (
                       'new',               -- Найден, не контактировали
                       'messaged',          -- Написали в Авито
                       'replied',           -- Ответил в Авито
                       'contact_collected', -- Получили телефон/контакт
                       'invite_sent',       -- Отправлена ссылка на регистрацию
                       'registered',        -- Зарегистрировался на платформе
                       'active',            -- Взял первый заказ
                       'lost',              -- Не заинтересован
                       'blocked'            -- Заблокирован
                     )),

  -- Контакт
  max_id           TEXT,
  telegram_id      TEXT,
  email            TEXT,
  
  -- Автоматизация
  contact_attempts  INTEGER NOT NULL DEFAULT 0,
  last_contacted_at TIMESTAMPTZ,
  next_followup_at  TIMESTAMPTZ,
  registered_at     TIMESTAMPTZ,
  first_order_at    TIMESTAMPTZ,

  -- Сопоставление с исполнителем
  contractor_id     TEXT,  -- ID в таблице contractors после регистрации

  -- Заметки
  admin_notes       TEXT,
  avito_message_draft TEXT,  -- Черновик сообщения для Авито

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_prospects_stage ON crm_executor_prospects(stage);
CREATE INDEX IF NOT EXISTS idx_crm_prospects_phone ON crm_executor_prospects(phone);
CREATE INDEX IF NOT EXISTS idx_crm_prospects_source ON crm_executor_prospects(source);
CREATE INDEX IF NOT EXISTS idx_crm_prospects_next_followup ON crm_executor_prospects(next_followup_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_prospects_avito_id ON crm_executor_prospects(avito_user_id)
  WHERE avito_user_id IS NOT NULL;

-- ── 3. CRM MESSAGES (история коммуникаций) ──

CREATE TABLE IF NOT EXISTS crm_messages (
  id              BIGSERIAL PRIMARY KEY,
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('lead', 'prospect')),
  entity_id       BIGINT NOT NULL,   -- ID в crm_lead_funnel или crm_executor_prospects
  
  direction       TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  channel         TEXT NOT NULL CHECK (channel IN ('max', 'telegram', 'email', 'avito', 'phone', 'sms')),
  
  message_text    TEXT NOT NULL,
  is_automated    BOOLEAN NOT NULL DEFAULT true,  -- Авто или вручную менеджер
  
  -- Статус доставки
  status          TEXT NOT NULL DEFAULT 'sent'
                    CHECK (status IN ('draft', 'sent', 'delivered', 'failed', 'read')),
  external_id     TEXT,  -- ID сообщения во внешней системе

  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_messages_entity ON crm_messages(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_messages_sent_at ON crm_messages(sent_at DESC);

-- ── RLS ──

ALTER TABLE crm_lead_funnel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON crm_lead_funnel
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE crm_executor_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON crm_executor_prospects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE crm_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON crm_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);
