import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';

const COOKIE_NAME = 'worker_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    const url = new URL('/app/profile?error=missing_token', req.url);
    return NextResponse.redirect(url);
  }

  const telegramId = verifySessionToken(token);
  if (!telegramId) {
    const url = new URL('/app/profile?error=invalid_token', req.url);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.redirect(new URL('/app/profile', req.url));
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return res;
}

