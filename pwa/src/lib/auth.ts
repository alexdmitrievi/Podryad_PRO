import { cookies } from 'next/headers';
import crypto from 'crypto';
import { getWorkerByTelegramId } from '@/lib/db';
import { getServiceClient } from '@/lib/supabase';

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
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET required');
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

  // Check revoke-list before verifying signature (fast path if revoked)
  const revoked = await isSessionRevoked(token);
  if (revoked) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [h64, p64, sig64] = parts;
  const secret = process.env.SESSION_SECRET;
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
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET required');
  }

  const exp = Math.floor(Date.now() / 1000) + 86400; // 24 hours
  const header = base64UrlEncodeJson({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlEncodeJson({
    purpose: 'escrow_confirm',
    orderId: params.orderId,
    role: params.role,
    sub: params.phone,
    exp,
  });
  const signingInput = `${header}.${payload}`;
  const sig = createHmac('sha256', secret).update(signingInput).digest();
  return `${header}.${payload}.${base64UrlEncodeBuffer(sig)}`;
}

/**
 * Verifies an escrow confirmation JWT.
 * Returns the payload if valid, null otherwise.
 * Checks: signature, expiry, purpose='escrow_confirm', required fields.
 */
export function verifyConfirmationToken(token: string): ConfirmationTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [h64, p64, sig64] = parts;
  const secret = process.env.SESSION_SECRET;
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

  let payload: ConfirmationTokenPayload;
  try {
    payload = JSON.parse(base64UrlToBuffer(p64).toString('utf8')) as ConfirmationTokenPayload;
  } catch {
    return null;
  }

  // Verify purpose — prevents cross-use with session tokens
  if (payload.purpose !== 'escrow_confirm') return null;

  // Verify expiry
  if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;

  // Verify required fields
  if (!payload.orderId || !payload.role || !payload.sub) return null;
  if (payload.role !== 'customer' && payload.role !== 'supplier') return null;

  return payload;
}

// ── SESSION REVOKE-LIST ────────────────────────────────────────────────────

function jtiHash(token: string): string {
  return crypto.createHash('sha256').update(token.slice(0, 64)).digest('hex');
}

/** Revoke a session token (JWT or legacy Telegram session). */
export async function revokeSessionToken(token: string): Promise<boolean> {
  try {
    const client = getServiceClient();
    const hash = jtiHash(token);
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days
    const { error } = await client.from('revoked_sessions').upsert({
      jti_hash: hash,
      expires_at: expiresAt,
    });
    return !error;
  } catch {
    return false;
  }
}

/** Check if a session token has been revoked. Returns true if revoked. */
export async function isSessionRevoked(token: string): Promise<boolean> {
  try {
    const client = getServiceClient();
    const hash = jtiHash(token);
    const { data, error } = await client
      .from('revoked_sessions')
      .select('jti_hash')
      .eq('jti_hash', hash)
      .maybeSingle();
    if (error) return false; // fail open — if DB is down, allow session
    return data !== null;
  } catch {
    return false;
  }
}

/** Verify admin PIN against DB admin_users table, fallback to env var. */
export async function verifyAdminPin(
  pin: string,
): Promise<{ valid: boolean; adminId?: string; username?: string }> {
  // Check DB admin_users first
  try {
    const client = getServiceClient();
    const { data: admins, error } = await client
      .from('admin_users')
      .select('id, username, pin_hash')
      .eq('is_active', true);

    if (!error && admins && admins.length > 0) {
      for (const admin of admins) {
        if (verifyPassword(pin, admin.pin_hash)) {
          // Update last_login
          void client
            .from('admin_users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', admin.id);
          return { valid: true, adminId: admin.id, username: admin.username };
        }
      }
      return { valid: false };
    }
  } catch {
    // DB not available — fall through to env var
  }

  // Fallback: single ADMIN_PIN env var
  const adminPin = process.env.ADMIN_PIN;
  if (adminPin) {
    const { timingSafeEqual } = crypto;
    const buf1 = Buffer.from(pin);
    const buf2 = Buffer.from(adminPin);
    if (buf1.length === buf2.length && timingSafeEqual(buf1, buf2)) {
      return { valid: true, adminId: 'env', username: 'admin' };
    }
  }

  return { valid: false };
}
