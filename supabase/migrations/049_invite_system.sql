-- =============================================================================
-- Migration 049: Invite system — bulk Telegram channel/chat invites
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUM: invite_target_type — channel or chat
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE invite_target_type AS ENUM ('channel', 'chat');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- ENUM: invite_status — per-queue-item status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE invite_status AS ENUM ('pending', 'in_progress', 'invited', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- ENUM: invite_list_status — batch-level status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE invite_list_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Таблица: invite_lists — загруженные списки для инвайтинга
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invite_lists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename        TEXT NOT NULL,
  target_type     invite_target_type NOT NULL DEFAULT 'channel',
  target_id       TEXT NOT NULL,
  target_name     TEXT,
  channel         messenger_channel NOT NULL DEFAULT 'telegram',
  total_count     INT NOT NULL DEFAULT 0,
  processed_count INT NOT NULL DEFAULT 0,
  invited_count   INT NOT NULL DEFAULT 0,
  failed_count    INT NOT NULL DEFAULT 0,
  skipped_count   INT NOT NULL DEFAULT 0,
  daily_limit     INT NOT NULL DEFAULT 15,
  status          invite_list_status NOT NULL DEFAULT 'draft',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invite_lists IS 'Загруженные Excel/CSV списки пользователей для инвайтинга в Telegram-каналы/чаты.';

CREATE INDEX IF NOT EXISTS idx_invite_lists_status ON public.invite_lists(status);

DROP TRIGGER IF EXISTS set_updated_at ON public.invite_lists;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.invite_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Таблица: invite_queue — отдельные задачи инвайтинга
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invite_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id         UUID NOT NULL REFERENCES public.invite_lists(id) ON DELETE CASCADE,
  telegram_id     BIGINT NOT NULL,
  username        TEXT,
  first_name      TEXT,
  last_name       TEXT,
  target_id       TEXT NOT NULL,
  target_type     invite_target_type NOT NULL DEFAULT 'channel',
  status          invite_status NOT NULL DEFAULT 'pending',
  retries         INT NOT NULL DEFAULT 0,
  max_retries     INT NOT NULL DEFAULT 3,
  error_message   TEXT,
  invited_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invite_queue IS 'Очередь задач на инвайтинг. Worker читает pending и выполняет.';

CREATE INDEX IF NOT EXISTS idx_invite_queue_status ON public.invite_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_invite_queue_list ON public.invite_queue(list_id);
CREATE INDEX IF NOT EXISTS idx_invite_queue_telegram ON public.invite_queue(telegram_id);

ALTER TABLE public.invite_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invite_queue_service_all" ON public.invite_queue
  FOR ALL USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS set_updated_at ON public.invite_queue;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.invite_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Таблица: invite_log — детальный лог результатов
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invite_log (
  id              BIGSERIAL PRIMARY KEY,
  queue_id        UUID NOT NULL REFERENCES public.invite_queue(id) ON DELETE CASCADE,
  list_id         UUID NOT NULL REFERENCES public.invite_lists(id) ON DELETE CASCADE,
  telegram_id     BIGINT NOT NULL,
  username        TEXT,
  success         BOOLEAN NOT NULL,
  error_message   TEXT,
  retry_number    INT NOT NULL DEFAULT 0,
  latency_ms      INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invite_log IS 'Детальный лог каждого инвайтинга (включая повторные попытки).';

CREATE INDEX IF NOT EXISTS idx_invite_log_list ON public.invite_log(list_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invite_log_queue ON public.invite_log(queue_id);
CREATE INDEX IF NOT EXISTS idx_invite_log_success ON public.invite_log(success, created_at DESC);

ALTER TABLE public.invite_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invite_log_service_all" ON public.invite_log
  FOR ALL USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- RPC: get_next_invite_batch — получить N задач для worker-а
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_next_invite_batch(
  p_limit         INT DEFAULT 5,
  p_target_status invite_status DEFAULT 'pending'
)
RETURNS TABLE (
  id          UUID,
  list_id     UUID,
  telegram_id BIGINT,
  username    TEXT,
  first_name  TEXT,
  last_name   TEXT,
  target_id   TEXT,
  target_type invite_target_type,
  retries     INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.invite_queue iq
  SET status = 'in_progress', updated_at = now()
  WHERE iq.id IN (
    SELECT q.id FROM public.invite_queue q
    WHERE q.status = 'pending'
    ORDER BY q.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING
    iq.id,
    iq.list_id,
    iq.telegram_id,
    iq.username,
    iq.first_name,
    iq.last_name,
    iq.target_id,
    iq.target_type,
    iq.retries;
END;
$$;

REVOKE ALL ON FUNCTION public.get_next_invite_batch(INT, invite_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_next_invite_batch(INT, invite_status) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: mark_invite_result — обновить статус + записать лог
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_invite_result(
  p_queue_id      UUID,
  p_success       BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_latency_ms    INT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_list_id     UUID;
  v_telegram_id BIGINT;
  v_username    TEXT;
  v_status      invite_status;
  v_retries     INT;
  v_max_retries INT;
BEGIN
  -- Get current state
  SELECT iq.list_id, iq.telegram_id, iq.username, iq.status, iq.retries, iq.max_retries
  INTO v_list_id, v_telegram_id, v_username, v_status, v_retries, v_max_retries
  FROM public.invite_queue iq
  WHERE iq.id = p_queue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite_queue item not found: %', p_queue_id;
  END IF;

  -- Write log
  INSERT INTO public.invite_log (queue_id, list_id, telegram_id, username, success, error_message, retry_number, latency_ms)
  VALUES (p_queue_id, v_list_id, v_telegram_id, v_username, p_success, p_error_message, v_retries, p_latency_ms);

  -- Update queue status
  IF p_success THEN
    UPDATE public.invite_queue
    SET status = 'invited', error_message = NULL, invited_at = now(), updated_at = now()
    WHERE id = p_queue_id;

    -- Increment invited_count on list
    UPDATE public.invite_lists
    SET invited_count = invited_count + 1, updated_at = now()
    WHERE id = v_list_id;
  ELSE
    IF v_retries + 1 >= v_max_retries THEN
      UPDATE public.invite_queue
      SET status = 'failed', error_message = p_error_message, retries = v_retries + 1, updated_at = now()
      WHERE id = p_queue_id;
    ELSE
      UPDATE public.invite_queue
      SET status = 'pending', error_message = p_error_message, retries = v_retries + 1, updated_at = now()
      WHERE id = p_queue_id;
    END IF;

    IF v_retries + 1 >= v_max_retries THEN
      UPDATE public.invite_lists
      SET failed_count = failed_count + 1, updated_at = now()
      WHERE id = v_list_id;
    END IF;
  END IF;

  -- Update list processed_count
  UPDATE public.invite_lists
  SET processed_count = processed_count + 1, updated_at = now()
  WHERE id = v_list_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_invite_result(UUID, BOOLEAN, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_invite_result(UUID, BOOLEAN, TEXT, INT) TO service_role;

-- ---------------------------------------------------------------------------
-- RLS for invite_lists
-- ---------------------------------------------------------------------------
ALTER TABLE public.invite_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invite_lists_service_all" ON public.invite_lists
  FOR ALL USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Таблица: worker_control — глобальный флаг активности воркера
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.worker_control (
  id           INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  worker_type  TEXT NOT NULL DEFAULT 'invite',
  is_active    BOOLEAN NOT NULL DEFAULT false,
  started_at   TIMESTAMPTZ,
  stopped_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.worker_control (id, worker_type, is_active)
VALUES (1, 'invite', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.worker_control ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worker_control_service_all" ON public.worker_control
  FOR ALL USING (auth.role() = 'service_role');
