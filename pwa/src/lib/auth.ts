import { cookies } from 'next/headers';
import crypto from 'crypto';

const { createHmac, createHash, timingSafeEqual } = crypto;
const COOKIE_NAME = 'worker_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const AUTH_MAX_AGE = 60 * 60 * 24; // 24 hours - reject auth older than this

export function verifyTelegramAuth(params: {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;

  const { hash, ...rest } = params;

  // Reject if auth is too old
  if (Math.floor(Date.now() / 1000) - params.auth_date > AUTH_MAX_AGE) {
    return false;
  }

  const dataCheckString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${(rest as Record<string, string | number>)[k]}`)
    .join('\n');

  const secretKey = createHash('sha256').update(botToken).digest();
  const computedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  try {
    const buf1 = Buffer.from(computedHash, 'hex');
    const buf2 = Buffer.from(hash, 'hex');
    if (buf1.length !== buf2.length) return false;
    return timingSafeEqual(buf1, buf2);
  } catch {
    return false;
  }
}

export async function createSession(telegramId: string): Promise<string> {
  const secret = process.env.SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || 'fallback-secret';
  const payload = `${telegramId}.${Date.now()}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function getTelegramIdFromSession(): Promise<string | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [telegramId, ts, sig] = parts;
  const secret = process.env.SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || 'fallback-secret';
  const payload = `${telegramId}.${ts}`;
  const expectedSig = createHmac('sha256', secret).update(payload).digest('hex');

  try {
    if (!timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      return null;
    }
  } catch {
    return null;
  }

  const age = Date.now() - parseInt(ts, 10);
  if (age > COOKIE_MAX_AGE * 1000) return null;

  return telegramId;
}
