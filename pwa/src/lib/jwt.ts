import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Единый HS256-JWT механизм проекта (подпись/проверка через SESSION_SECRET).
 * Используется для cookie `podryad_session` и escrow-токенов подтверждения.
 *
 * Примечание: middleware (edge runtime) и customerAuth используют jose —
 * node:crypto в edge недоступен, поэтому там отдельная реализация.
 */

export const SESSION_JWT_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 дней
export const CONFIRMATION_TOKEN_TTL_SEC = 86400; // 24 часа

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

function base64UrlToBuffer(s: string): Buffer {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(b64, 'base64');
}

/** Подписать JWT (HS256, ключ SESSION_SECRET). Бросает ошибку без секрета. */
export function signJwt(payload: Record<string, unknown>): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET required');
  }

  const header = base64UrlEncodeJson({ alg: 'HS256', typ: 'JWT' });
  const body = base64UrlEncodeJson(payload);
  const signingInput = `${header}.${body}`;
  const sig = createHmac('sha256', secret).update(signingInput).digest();
  return `${header}.${body}.${base64UrlEncodeBuffer(sig)}`;
}

/**
 * Проверить подпись и структуру JWT, вернуть payload.
 * Возвращает null при: неверной структуре, битой подписи, невалидном JSON,
 * отсутствии SESSION_SECRET. Срок действия (exp) вызывающий код проверяет сам.
 */
export function verifyJwt(token: string): Record<string, unknown> | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [h64, p64, sig64] = parts;
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

  try {
    return JSON.parse(base64UrlToBuffer(p64).toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Проверка exp: payload.exp (unix-секунды) ещё не истёк. */
export function isExpired(payload: Record<string, unknown>): boolean {
  return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
}
