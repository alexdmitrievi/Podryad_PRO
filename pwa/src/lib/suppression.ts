import { getServiceClient } from '@/lib/supabase';

/**
 * Global suppression (opt-out / stop-list) across all outreach channels.
 * Every send path (Coldy outbound, TG/MAX agent, WhatsApp) must call
 * isSuppressed() before sending.
 */

export interface SuppressionRow {
  id: number;
  channel: string;
  identifier: string;
  reason: string;
  source: string;
  created_at: string;
}

/** True if the identifier is suppressed for the given channel (or globally via channel 'any'). */
export async function isSuppressed(channel: string, identifier: string): Promise<boolean> {
  if (!identifier) return false;
  const db = getServiceClient();
  const { data, error } = await db
    .from('suppression_list')
    .select('id')
    .in('channel', [channel, 'any'])
    .eq('identifier', identifier.trim().toLowerCase())
    .limit(1);
  if (error) return false; // fail-open only on read error; never silently block
  return (data?.length ?? 0) > 0;
}

export async function addToSuppression(
  channel: string,
  identifier: string,
  reason = '',
  source = 'manual',
): Promise<boolean> {
  const db = getServiceClient();
  const { error } = await db.from('suppression_list').upsert(
    { channel, identifier: identifier.trim().toLowerCase(), reason, source },
    { onConflict: 'channel,identifier' },
  );
  return !error;
}
