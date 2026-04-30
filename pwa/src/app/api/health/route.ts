import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

/**
 * GET /api/health
 * Public health-check + queue stats.
 * Returns 200 if DB is reachable and queue is healthy.
 * Returns 503 if DB is unreachable or dead-job count is above threshold.
 */
export async function GET() {
  const db = getServiceClient();

  let queueStats: Array<{ status: string; cnt: number }> = [];
  let dbOk = false;

  try {
    const { data, error } = await db.rpc('get_job_queue_stats');
    if (!error && data) {
      queueStats = (data as Array<{ status: string; cnt: string | number }>).map((r) => ({
        status: r.status,
        cnt: Number(r.cnt),
      }));
      dbOk = true;
    }
  } catch {
    dbOk = false;
  }

  const byStatus = Object.fromEntries(queueStats.map((r) => [r.status, r.cnt]));
  const deadCount = byStatus['dead'] ?? 0;
  const pendingCount = byStatus['pending'] ?? 0;
  const processingCount = byStatus['processing'] ?? 0;

  // Alert thresholds
  const DEAD_THRESHOLD = 10;
  const STUCK_THRESHOLD = 50; // pending pile-up suggests cron is not running

  const alerts: string[] = [];
  if (!dbOk) alerts.push('db_unreachable');
  if (deadCount >= DEAD_THRESHOLD) alerts.push(`dead_jobs:${deadCount}`);
  if (pendingCount >= STUCK_THRESHOLD) alerts.push(`pending_backlog:${pendingCount}`);

  const healthy = alerts.length === 0;

  return NextResponse.json(
    {
      ok: healthy,
      db: dbOk,
      queue: { dead: deadCount, pending: pendingCount, processing: processingCount },
      alerts,
    },
    { status: healthy ? 200 : 503 },
  );
}
