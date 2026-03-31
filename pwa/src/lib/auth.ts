import { cookies } from 'next/headers';
import crypto from 'crypto';
import { getWorkerByTelegramId } from '@/lib/db';

/** Нормализация телефона: 79001234567 */
export function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return `7${d}`;
  if (d.length === 11 && d.startsWith('8')) return `7${d.slice(1)}`;
  if (d.length === 11 && d.startsWith('7')) return d;
  return d;
}

const { createHmac, createHash, timingSafeEqual, randomBytes, scryptSync } = crypto;
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
  const secret = process.env.SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN;
  if (!secret) throw new Error('SESSION_SECRET or TELEGRAM_BOT_TOKEN required');
  const payload = `${telegramId}.${Date.now()}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export function verifySessionToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [telegramId, ts, sig] = parts;
  const secret = process.env.SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN;
  if (!secret) return null;
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

export async function getTelegramIdFromSession(): Promise<string | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return verifySessionToken(token);
}

export type PodryadSession = {
  user_id: string;
  role: 'worker' | 'customer' | 'supplier';
};

function base64UrlToBuffer(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

function base64UrlEncodeJson(obj: object): string {
  return Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlEncodeBuffer(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const SCRYPT_SALT_BYTES = 16;
const SCRYPT_KEYLEN = 64;

/** Хеш пароля для хранения в БД (scrypt). */
export function hashPassword(password: string): string {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const key = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt1$${salt.toString('hex')}$${key.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt1') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const key = Buffer.from(parts[2], 'hex');
  const key2 = scryptSync(password, salt, key.length);
  try {
    return timingSafeEqual(key, key2);
  } catch {
    return false;
  }
}

/** Подпись JWT для cookie `podryad_session` (совместимо с getSession). */
export function signPodryadSession(params: {
  user_id: string;
  role: 'worker' | 'customer' | 'supplier';
  maxAgeSec?: number;
}): string {
  const secret = process.env.SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN;
  if (!secret) {
    throw new Error('SESSION_SECRET_OR_TELEGRAM_BOT_TOKEN_REQUIRED');
  }

  const exp = Math.floor(Date.now() / 1000) + (params.maxAgeSec ?? 60 * 60 * 24 * 30);
  const header = base64UrlEncodeJson({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlEncodeJson({
    sub: params.user_id,
    role: params.role,
    exp,
  });
  const signingInput = `${header}.${payload}`;
  const sig = createHmac('sha256', secret).update(signingInput).digest();
  const sig64 = base64UrlEncodeBuffer(sig);
  return `${header}.${payload}.${sig64}`;
}

/** JWT (HS256) из cookie `podryad_session`: payload { sub|user_id, role, exp? } */
export async function getSession(): Promise<PodryadSession | null> {
  const store = await cookies();
  const token = store.get('podryad_session')?.value;
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [h64, p64, sig64] = parts;
  const secret = process.env.SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN;
  if (!secret) return null;

  const signingInput = `${h64}.${p64}`;
  const expectedSig = createHmac('sha256', secret).update(signingInput).digest();

  let actualSig: Buffer;
  try {
    actualSig = base64UrlToBuffer(sig64);
  } catch {
    return null;
  }
  if (expectedSig.length !== actualSig.length) return null;
  try {
    if (!timingSafeEqual(expectedSig, actualSig)) return null;
  } catch {
    return null;
  }

  let payload: { sub?: string; user_id?: string; role?: string; exp?: number };
  try {
    payload = JSON.parse(base64UrlToBuffer(p64).toString('utf8')) as typeof payload;
  } catch {
    return null;
  }

  if (payload.exp !== undefined && typeof payload.exp === 'number') {
    if (payload.exp * 1000 < Date.now()) return null;
  }

  const uid = payload.sub ?? payload.user_id;
  if (!uid || typeof uid !== 'string') return null;
  if (payload.role !== 'worker' && payload.role !== 'customer') return null;

  return { user_id: uid, role: payload.role };
}

/** JWT или Telegram-сессия: роль заказчика, если пользователя нет в таблице Workers. */
export type ViewerSession = {
  user_id: string;
  role: 'worker' | 'customer' | 'supplier';
};

export async function getViewerSession(): Promise<ViewerSession | null> {
  const jwt = await getSession();
  if (jwt) {
    return { user_id: jwt.user_id, role: jwt.role };
  }
  const tg = await getTelegramIdFromSession();
  if (!tg) return null;
  const worker = await getWorkerByTelegramId(tg);
  return {
    user_id: tg,
    role: worker ? 'worker' : 'customer',
  };
}

/** Только исполнитель (JWT worker или Telegram + строка в Workers). */
export async function getWorkerActor(): Promise<{ user_id: string } | null> {
  const jwt = await getSession();
  if (jwt) {
    if (jwt.role !== 'worker') return null;
    return { user_id: jwt.user_id };
  }
  const tg = await getTelegramIdFromSession();
  if (!tg) return null;
  const worker = await getWorkerByTelegramId(tg);
  if (!worker) return null;
  return { user_id: tg };
}
