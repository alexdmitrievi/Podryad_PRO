import { NextRequest, NextResponse } from 'next/server';
import { broadcastPush } from '@/lib/push';
import { log } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin || pin !== adminPin) {
    const { timingSafeEqual } = await import('crypto');
    const pinBuf = Buffer.from(pin);
    const expectedBuf = Buffer.from(adminPin || '');
    if (pinBuf.length !== expectedBuf.length || !timingSafeEqual(pinBuf, expectedBuf)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  let body: { title?: string; body?: string; url?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.title || !body.body) {
    return NextResponse.json({ error: 'title and body required' }, { status: 400 });
  }

  try {
    const result = await broadcastPush(body.title, body.body, body.url);
    log.info('Push campaign sent', { ...result });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('Push campaign failed', { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
