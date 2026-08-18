import { cookies } from 'next/headers';
import crypto from 'crypto';
import { getWorkerByTelegramId } from '@/lib/db';
import { signJwt, verifyJwt, isExpired, SESSION_JWT_MAX_AGE_SEC, CONFIRMATION_TOKEN_TTL_SEC } from '@/lib/jwt';
import { isSessionRevoked } from '@/lib/revoke-list';

// Обратная совместимость для существующих импортов.
export { verifyAdminPin } from '@/lib/admin-pin';
export { revokeSessionToken, isSessionRevoked } from '@/lib/revoke-list';

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

// ── Legacy Telegram-сессия (формат `${telegramId}.${ts}.${sig}`, НЕ JWT) ──

export async function createSession(telegramId: string): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET required');
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
  const secret = process.env.SESSION_SECRET;
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
  // Check revoke-list
  const revoked = await isSessionRevoked(token);
  if (revoked) return null;
  return verifySessionToken(token);
}

// ── Пароли (scrypt) ──

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

// ── JWT cookie `podryad_session` ──

export type PodryadSession = {
  user_id: string;
  role: 'worker' | 'customer' | 'supplier';
};

/** Подпись JWT для cookie `podryad_session` (совместимо с getSession). */
export function signPodryadSession(params: {
  user_id: string;
  role: 'worker' | 'customer' | 'supplier';
  maxAgeSec?: number;
}): string {
  const exp = Math.floor(Date.now() / 1000) + (params.maxAgeSec ?? SESSION_JWT_MAX_AGE_SEC);
  return signJwt({
    sub: params.user_id,
    role: params.role,
    exp,
  });
}

/** JWT (HS256) из cookie `podryad_session`: payload { sub|user_id, role, exp? } */
export async function getSession(): Promise<PodryadSession | null> {
  const store = await cookies();
  const token = store.get('podryad_session')?.value;
  if (!token) return null;

  // Check revoke-list before verifying signature (fast path if revoked)
  const revoked = await isSessionRevoked(token);
  if (revoked) return null;

  const payload = verifyJwt(token);
  if (!payload) return null;
  if (isExpired(payload)) return null;

  const uid = payload.sub ?? payload.user_id;
  if (!uid || typeof uid !== 'string') return null;
  if (payload.role !== 'worker' && payload.role !== 'customer' && payload.role !== 'supplier') return null;

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

// ── ESCROW CONFIRMATION TOKENS ──

export interface ConfirmationTokenPayload {
  purpose: 'escrow_confirm';
  orderId: string;
  role: 'customer' | 'supplier';
  sub: string;  // phone number
  exp: number;  // unix timestamp
}

/**
 * Signs a short-lived JWT (24h) for escrow confirmation links.
 * Reuses the same HS256/SESSION_SECRET as signPodryadSession.
 * The purpose:'escrow_confirm' field prevents cross-use with session tokens.
 */
export function signConfirmationToken(params: {
  orderId: string;
  role: 'customer' | 'supplier';
  phone: string;
}): string {
  const exp = Math.floor(Date.now() / 1000) + CONFIRMATION_TOKEN_TTL_SEC;
  return signJwt({
    purpose: 'escrow_confirm',
    orderId: params.orderId,
    role: params.role,
    sub: params.phone,
    exp,
  });
}

/**
 * Verifies an escrow confirmation JWT.
 * Returns the payload if valid, null otherwise.
 * Checks: signature, expiry, purpose='escrow_confirm', required fields.
 */
export function verifyConfirmationToken(token: string): ConfirmationTokenPayload | null {
  const payload = verifyJwt(token);
  if (!payload) return null;
  if (isExpired(payload)) return null;

  // Verify purpose — prevents cross-use with session tokens
  if (payload.purpose !== 'escrow_confirm') return null;

  // Verify required fields
  if (!payload.orderId || !payload.role || !payload.sub) return null;
  if (payload.role !== 'customer' && payload.role !== 'supplier') return null;

  return payload as unknown as ConfirmationTokenPayload;
}
