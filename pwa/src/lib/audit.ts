import { getServiceClient } from './supabase';
import { log } from '@/lib/logger';

export interface AuditLogEntry {
  admin_id?: string;
  admin_username?: string;
  action: string;
  endpoint: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const client = getServiceClient();
    const { error } = await client.from('admin_audit_log').insert({
      admin_id: entry.admin_id ?? null,
      admin_username: entry.admin_username ?? null,
      action: entry.action,
      endpoint: entry.endpoint,
      ip_address: entry.ip_address ?? null,
      user_agent: entry.user_agent?.slice(0, 256) ?? null,
      details: entry.details ?? {},
    });
    if (error) {
      // Fail silently — audit should never block the actual request
      log.error('[audit] write failed', { error: error.message });
    }
  } catch (err) {
    log.error('[audit] write exception', { error: String(err) });
  }
}
