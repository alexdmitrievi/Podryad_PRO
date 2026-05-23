-- =============================================================================
-- Migration 050: Invite accounts — multiple MTProto accounts support
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Таблица: invite_accounts — технические аккаунты для инвайтинга
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invite_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           TEXT NOT NULL,
  label           TEXT NOT NULL,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invite_accounts IS 'Технические Telegram-аккаунты, используемые для инвайтинга через MTProto.';

ALTER TABLE public.invite_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invite_accounts_service_all" ON public.invite_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Колонка: invite_lists.inviter_account_id — привязка списка к аккаунту
-- ---------------------------------------------------------------------------
ALTER TABLE public.invite_lists
  ADD COLUMN IF NOT EXISTS inviter_account_id UUID
  REFERENCES public.invite_accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.invite_lists.inviter_account_id IS 'Аккаунт, через который выполняются приглашения из этого списка.';

-- ---------------------------------------------------------------------------
-- Seed: авто-вставка дефолтного аккаунта из .env, если INVITE_ACCOUNT_PHONE задан
-- ---------------------------------------------------------------------------
-- Заполняется вручную или через edge-функцию при деплое.
-- Здесь оставляем заглушку — админ добавляет аккаунты через SQL.
