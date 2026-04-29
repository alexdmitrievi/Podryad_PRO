-- Migration 027: durable job queue for Vercel worker execution
-- 2026-04-29
--
-- Goal:
-- Move business automation out of n8n webhooks into application code while
-- keeping retries, scheduling and locking durable inside Postgres.
--
-- Model:
-- 1. API routes insert rows into public.job_queue after successful DB writes.
-- 2. Vercel Cron calls an API route that claims a small batch via claim_jobs().
-- 3. Worker handlers execute in app code and mark jobs completed / rescheduled.

CREATE TABLE IF NOT EXISTS public.job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name TEXT NOT NULL DEFAULT 'default',
  job_type TEXT NOT NULL,
  dedupe_key TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority SMALLINT NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'dead', 'cancelled')),
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 8 CHECK (max_attempts > 0),
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  lease_until TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  result JSONB,
  source_table TEXT,
  source_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT job_queue_completed_at_chk CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status <> 'completed')
  )
);

COMMENT ON TABLE public.job_queue IS
  'Durable application job queue used by Vercel cron/worker handlers.';
COMMENT ON COLUMN public.job_queue.dedupe_key IS
  'Optional idempotency key. Unique while a job is pending or processing.';
COMMENT ON COLUMN public.job_queue.run_at IS
  'Earliest time when the job becomes eligible for claim.';
COMMENT ON COLUMN public.job_queue.lease_until IS
  'Soft lock expiry used to recover jobs abandoned by timed out workers.';

CREATE INDEX IF NOT EXISTS idx_job_queue_pending_due
  ON public.job_queue (queue_name, run_at, priority DESC, created_at)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_job_queue_type_status_run_at
  ON public.job_queue (job_type, status, run_at);

CREATE INDEX IF NOT EXISTS idx_job_queue_source
  ON public.job_queue (source_table, source_id);

CREATE INDEX IF NOT EXISTS idx_job_queue_processing_lease
  ON public.job_queue (lease_until)
  WHERE status = 'processing';

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_queue_dedupe_active
  ON public.job_queue (dedupe_key)
  WHERE dedupe_key IS NOT NULL
    AND status IN ('pending', 'processing');

ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_queue_service_all" ON public.job_queue;
CREATE POLICY "job_queue_service_all" ON public.job_queue
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS job_queue_set_updated_at ON public.job_queue;
CREATE TRIGGER job_queue_set_updated_at
  BEFORE UPDATE ON public.job_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.claim_jobs(
  p_worker_id TEXT,
  p_limit INTEGER DEFAULT 10,
  p_queue_name TEXT DEFAULT NULL,
  p_lease_seconds INTEGER DEFAULT 300
)
RETURNS SETOF public.job_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_queue_name TEXT := NULLIF(BTRIM(p_queue_name), '');
BEGIN
  IF NULLIF(BTRIM(p_worker_id), '') IS NULL THEN
    RAISE EXCEPTION 'p_worker_id is required';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 100';
  END IF;

  IF p_lease_seconds IS NULL OR p_lease_seconds < 30 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'p_lease_seconds must be between 30 and 3600';
  END IF;

  UPDATE public.job_queue
     SET status = 'dead',
         locked_by = NULL,
         locked_at = NULL,
         lease_until = NULL,
         last_error = COALESCE(last_error, 'Max attempts exceeded'),
         last_error_at = COALESCE(last_error_at, now()),
         updated_at = now()
   WHERE status IN ('pending', 'processing')
     AND attempts >= max_attempts
     AND (status <> 'processing' OR lease_until IS NULL OR lease_until < now());

  RETURN QUERY
  WITH picked AS (
    SELECT j.id
    FROM public.job_queue AS j
    WHERE j.run_at <= now()
      AND j.attempts < j.max_attempts
      AND (v_queue_name IS NULL OR j.queue_name = v_queue_name)
      AND (
        j.status = 'pending'
        OR (
          j.status = 'processing'
          AND (j.lease_until IS NULL OR j.lease_until < now())
        )
      )
    ORDER BY j.priority DESC, j.run_at ASC, j.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.job_queue AS j
     SET status = 'processing',
         attempts = j.attempts + 1,
         locked_by = p_worker_id,
         locked_at = now(),
         lease_until = now() + make_interval(secs => p_lease_seconds),
         updated_at = now()
    FROM picked AS p
   WHERE j.id = p.id
   RETURNING j.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_jobs(TEXT, INTEGER, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_jobs(TEXT, INTEGER, TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION public.claim_jobs(TEXT, INTEGER, TEXT, INTEGER) IS
  'Atomically leases due jobs from job_queue for a worker instance.';
