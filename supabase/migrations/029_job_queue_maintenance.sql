-- Migration 029: job_queue maintenance — auto-cleanup + stats function
-- 2026-04-30
--
-- Problems solved:
-- 1. Completed / dead jobs accumulate indefinitely → table bloat, slow index scans
-- 2. No way to query queue health from application code for monitoring
--
-- Solution:
-- A. cleanup_job_queue(retention_days) — deletes old completed/dead rows,
--    returns count deleted. Called nightly by the analytics cron via job-queue.
-- B. get_job_queue_stats() — returns counts by status for health monitoring.
--    Used by /api/health and the dead-job alert in analytics.daily_admin_report.

-- ─────────────────────────────────────────────────────────────────────────────
-- A. Cleanup function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_job_queue(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted INTEGER;
BEGIN
  DELETE FROM public.job_queue
  WHERE status IN ('completed', 'dead', 'cancelled')
    AND updated_at < now() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_job_queue(INTEGER) IS
  'Deletes completed/dead/cancelled job_queue rows older than retention_days (default 30).
   Returns the number of deleted rows. Safe to call multiple times (idempotent).';

-- ─────────────────────────────────────────────────────────────────────────────
-- B. Stats function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_job_queue_stats()
RETURNS TABLE(
  status        TEXT,
  cnt           BIGINT,
  oldest_run_at TIMESTAMPTZ,
  newest_run_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    jq.status,
    COUNT(*)                   AS cnt,
    MIN(jq.run_at)             AS oldest_run_at,
    MAX(jq.run_at)             AS newest_run_at
  FROM public.job_queue jq
  GROUP BY jq.status
  ORDER BY jq.status;
$$;

COMMENT ON FUNCTION public.get_job_queue_stats() IS
  'Returns per-status row counts and run_at range for the job_queue table.
   Used by /api/health and the nightly analytics report.';

-- Grant EXECUTE to service_role (PostgREST RPC callers)
GRANT EXECUTE ON FUNCTION public.cleanup_job_queue(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_job_queue_stats()       TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- C. Partial index to speed up cleanup query (optional, belt-and-suspenders)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_job_queue_cleanup
  ON public.job_queue (updated_at)
  WHERE status IN ('completed', 'dead', 'cancelled');
