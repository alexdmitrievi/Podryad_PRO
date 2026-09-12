import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { sendDraftsForReview } from '@/lib/outreach/review';
import { log } from '@/lib/logger';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

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

/**
 * GET /api/cron/outreach-review
 *
 * Pushes draft outreach_tasks (created by Parser sync-crm) to the owner's
 * Telegram chat with OK/Edit/Reject buttons. Scheduled alongside other crons.
 * Query: ?limit=N (1..10, default 5).
 */
export async function GET(req: NextRequest) {
  if (!verifyWorkerSecret(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get('limit') ?? '5');
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(Math.trunc(rawLimit), 10)) : 5;

  try {
    const sent = await sendDraftsForReview(limit);
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    log.error('cron/outreach-review error', { error: String(err) });
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
