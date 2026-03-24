import { NextRequest, NextResponse } from 'next/server';
import { verifyTelegramAuth } from '@/lib/auth';

const COOKIE_NAME = 'worker_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const hash = searchParams.get('hash');
  const auth_date = searchParams.get('auth_date');

  if (!id || !hash || !auth_date) {
    return NextResponse.redirect(new URL('/app/profile?error=missing', req.url));
  }

  const isValid = verifyTelegramAuth({
    id: parseInt(id, 10),
    first_name: searchParams.get('first_name') ?? undefined,
    last_name: searchParams.get('last_name') ?? undefined,
    username: searchParams.get('username') ?? undefined,
    photo_url: searchParams.get('photo_url') ?? undefined,
    auth_date: parseInt(auth_date, 10),
    hash,
  });

  if (!isValid) {
    return NextResponse.redirect(new URL('/app/profile?error=invalid', req.url));
  }

  const secret = process.env.SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN;
  if (!secret) {
    return NextResponse.redirect(new URL('/app/profile?error=config', req.url));
  }
  const crypto = await import('crypto');
  const payload = `${id}.${Date.now()}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const token = `${payload}.${sig}`;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const res = NextResponse.redirect(new URL('/app/profile', baseUrl));
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return res;
}
