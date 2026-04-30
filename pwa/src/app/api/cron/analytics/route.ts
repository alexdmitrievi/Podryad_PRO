import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { enqueueJob } from '@/lib/job-queue';

function verifyWorkerSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const direct = req.headers.get('x-cron-secret') ?? '';
  const candidate = bearer || direct;
  if (!candidate) return false;

  const actual = Buffer.from(candidate);
  const expected = Buffer.from(secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(req: NextRequest) {
  if (!verifyWorkerSecret(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  await enqueueJob({
    queueName: 'analytics',
    jobType: 'analytics.daily_admin_report',
    dedupeKey: `analytics:daily:${today}`,
    payload: { date: today },
    maxAttempts: 3,
  });

  return NextResponse.json({ ok: true, date: today });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
