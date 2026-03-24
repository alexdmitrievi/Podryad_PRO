import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const pinAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 минут

function isPinRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = pinAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    pinAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isPinRateLimited(clientIp)) {
    return NextResponse.json(
      { valid: false, error: 'Слишком много попыток. Повторите через 15 минут.' },
      { status: 429 }
    );
  }

  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    return NextResponse.json({ valid: false }, { status: 500 });
  }

  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const pin = body.pin ?? '';
  const valid =
    pin.length === adminPin.length &&
    crypto.timingSafeEqual(Buffer.from(pin), Buffer.from(adminPin));

  // При успехе сбрасываем счётчик
  if (valid) {
    pinAttempts.delete(clientIp);
  }

  return NextResponse.json({ valid });
}
