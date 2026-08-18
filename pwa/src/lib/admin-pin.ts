import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';
import { verifyPassword } from '@/lib/auth';

/** Время последнего входа администратора (fire-and-forget апдейт). */
function recordAdminLogin(adminId: string): void {
  try {
    const client = getServiceClient();
    void client
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', adminId);
  } catch {
    // не критично: не блокируем вход из-за ошибки аудита
  }
}

/** Валиден ли PIN по таблице admin_users; фолбэк — ADMIN_PIN из окружения. */
export async function verifyAdminPin(
  pin: string,
): Promise<{ valid: boolean; adminId?: string; username?: string }> {
  // Сначала — БД admin_users
  try {
    const client = getServiceClient();
    const { data: admins, error } = await client
      .from('admin_users')
      .select('id, username, pin_hash')
      .eq('is_active', true);

    if (!error && admins && admins.length > 0) {
      for (const admin of admins) {
        if (verifyPassword(pin, admin.pin_hash)) {
          recordAdminLogin(admin.id);
          return { valid: true, adminId: admin.id, username: admin.username };
        }
      }
      return { valid: false };
    }
  } catch {
    // БД недоступна — переходим к env-фолбэку
  }

  const adminPin = process.env.ADMIN_PIN;
  if (adminPin) {
    const buf1 = Buffer.from(pin);
    const buf2 = Buffer.from(adminPin);
    if (buf1.length === buf2.length && timingSafeEqual(buf1, buf2)) {
      return { valid: true, adminId: 'env', username: 'admin' };
    }
  }

  return { valid: false };
}
