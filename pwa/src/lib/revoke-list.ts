import { createHash } from 'crypto';
import { getServiceClient } from '@/lib/supabase';

/** Срок хранения записи в revoke-list: 90 дней. */
export const REVOKE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

function jtiHash(token: string): string {
  return createHash('sha256').update(token.slice(0, 64)).digest('hex');
}

/** Revoke a session token (JWT or legacy Telegram session). */
export async function revokeSessionToken(token: string): Promise<boolean> {
  try {
    const client = getServiceClient();
    const hash = jtiHash(token);
    const expiresAt = new Date(Date.now() + REVOKE_RETENTION_MS).toISOString();
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
    if (error) return false; // fail open — если БД недоступна, сессию пропускаем
    return data !== null;
  } catch {
    return false;
  }
}
