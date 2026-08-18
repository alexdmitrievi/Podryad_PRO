import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { spawn } from 'child_process';
import { log } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/deploy
 *
 * Запускает /home/ubuntu/deploy.sh на VM (git fetch+reset → build → pm2 restart)
 * в фоне и сразу отвечает 202. Требует Bearer DEPLOY_TOKEN.
 * Используется CI (GitHub Actions), которому SG закрывает прямой SSH :22.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.DEPLOY_TOKEN;
  if (!expected) {
    log.error('[deploy] DEPLOY_TOKEN not configured');
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }

  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  try {
    const child = spawn('/bin/bash', ['/home/ubuntu/deploy.sh'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } catch (err) {
    log.error('[deploy] spawn failed', { error: String(err) });
    return NextResponse.json({ ok: false, error: 'spawn_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, started: true }, { status: 202 });
}
