import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { crosspostPaidOrdersToMax } from '@/lib/job-worker';
import { log } from '@/lib/logger';

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

  try {
    const result = await crosspostPaidOrdersToMax(5);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('crosspost cron error', { error: String(message) });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
