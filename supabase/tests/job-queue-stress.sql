-- Job Queue Stress Test & Health Check
-- Run against Supabase to verify job_queue reliability under load
-- Usage: psql <connection-string> -f job-queue-stress.sql

-- ============================================================
-- 1. CURRENT QUEUE HEALTH
-- ============================================================
SELECT '=== JOB QUEUE STATUS SUMMARY ===' as section;

SELECT
  status,
  queue_name,
  count(*) as count,
  min(created_at) as oldest_job,
  max(created_at) as newest_job
FROM public.job_queue
GROUP BY status, queue_name
ORDER BY status, queue_name;

-- ============================================================
-- 2. DEAD JOBS ANALYSIS
-- ============================================================
SELECT '=== DEAD JOBS (last 24h) ===' as section;

SELECT
  id,
  queue_name,
  job_type,
  last_error,
  last_error_at,
  attempts,
  max_attempts,
  created_at
FROM public.job_queue
WHERE status = 'dead'
  AND updated_at > now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================
-- 3. STALE PROCESSING JOBS (stuck > 5 min)
-- ============================================================
SELECT '=== STALE PROCESSING JOBS (stuck > 5 min) ===' as section;

SELECT
  id,
  queue_name,
  job_type,
  locked_by,
  locked_at,
  lease_until,
  EXTRACT(EPOCH FROM (now() - updated_at))::int as seconds_since_update
FROM public.job_queue
WHERE status = 'processing'
  AND updated_at < now() - interval '5 minutes'
ORDER BY updated_at ASC
LIMIT 20;

-- ============================================================
-- 4. CLAIM_JOBS FUNCTION TEST
-- ============================================================
SELECT '=== CLAIM_JOBS() FUNCTIONAL TEST ===' as section;

-- Test: claim with a test worker
SELECT * FROM public.claim_jobs('stress-test-worker', 5, NULL, 60) LIMIT 5;

-- Test: claim from specific queue
SELECT * FROM public.claim_jobs('stress-test-worker', 3, 'crm', 60) LIMIT 3;

-- ============================================================
-- 5. RETRY BACKOFF VERIFICATION
-- ============================================================
SELECT '=== PENDING JOBS WITH RETRY ATTEMPTS ===' as section;

SELECT
  id,
  queue_name,
  job_type,
  attempts,
  max_attempts,
  run_at,
  last_error,
  CASE
    WHEN attempts >= max_attempts THEN 'WILL BECOME DEAD'
    WHEN attempts >= max_attempts * 0.75 THEN 'NEAR DEATH'
    WHEN attempts > 0 THEN 'RETRYING'
    ELSE 'FRESH'
  END as health
FROM public.job_queue
WHERE status = 'pending'
  AND attempts > 0
ORDER BY attempts DESC
LIMIT 20;

-- ============================================================
-- 6. QUEUE THROUGHPUT (last hour)
-- ============================================================
SELECT '=== QUEUE THROUGHPUT (last hour) ===' as section;

SELECT
  queue_name,
  job_type,
  count(*) as processed,
  avg(EXTRACT(EPOCH FROM (completed_at - created_at)))::numeric(10,1) as avg_seconds_to_complete
FROM public.job_queue
WHERE status = 'completed'
  AND completed_at > now() - interval '1 hour'
GROUP BY queue_name, job_type
ORDER BY processed DESC;

-- ============================================================
-- 7. ORPHANED JOBS (missing source data)
-- ============================================================
SELECT '=== ORPHANED LEADS (job_queue referencing deleted leads) ===' as section;

SELECT jq.id as job_id, jq.source_id, jq.source_table, jq.created_at
FROM public.job_queue jq
LEFT JOIN public.leads l ON l.id::text = jq.source_id
WHERE jq.source_table = 'leads'
  AND l.id IS NULL
  AND jq.status NOT IN ('completed', 'cancelled')
LIMIT 20;

-- ============================================================
-- 8. STRESS TEST: INSERT 50 BULK JOBS
-- ============================================================
SELECT '=== STRESS TEST: INSERTING 50 TEST JOBS ===' as section;

INSERT INTO public.job_queue (queue_name, job_type, payload, priority, max_attempts, run_at)
SELECT
  'stress_test',
  'test_ping',
  jsonb_build_object('test_id', gs, 'message', 'stress test job ' || gs),
  100,
  3,
  now() - interval '1 second'  -- ready immediately
FROM generate_series(1, 50) AS gs;

SELECT count(*) as inserted_jobs FROM public.job_queue WHERE queue_name = 'stress_test';

-- ============================================================
-- 9. CLEANUP TEST JOBS
-- ============================================================
SELECT '=== CLEANING UP TEST JOBS ===' as section;

DELETE FROM public.job_queue WHERE queue_name = 'stress_test';

SELECT count(*) as remaining_test_jobs FROM public.job_queue WHERE queue_name = 'stress_test';
