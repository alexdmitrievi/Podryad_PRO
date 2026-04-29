import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { claimJobs } from '@/lib/job-queue';
import { processClaimedJobs } from '@/lib/job-worker';

function verifyWorkerSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const direct = req.headers.get('x-cron-secret') ?? '';
  const candidate = bearer || direct;
  if (!candidate) {
    return false;
  }

  const actual = Buffer.from(candidate);
  const expected = Buffer.from(secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function runWorker(req: NextRequest) {
  if (!verifyWorkerSecret(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const requestedLimit = Number(searchParams.get('limit') ?? '10');
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(Math.trunc(requestedLimit), 25))
    : 10;
  const queueName = searchParams.get('queue_name') || undefined;
  const workerId = `vercel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const jobs = await claimJobs({
      workerId,
      limit,
      queueName,
      leaseSeconds: 300,
    });
    const processed = await processClaimedJobs(jobs);

    return NextResponse.json({
      ok: true,
      worker_id: workerId,
      claimed: jobs.length,
      ...processed,
    });
  } catch (error) {
    console.error('GET /api/cron/jobs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return runWorker(req);
}

export async function POST(req: NextRequest) {
  return runWorker(req);
}