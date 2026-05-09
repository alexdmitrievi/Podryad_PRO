// Bot Supabase access layer — uses existing getServiceClient from @/lib/supabase
import { getServiceClient } from '@/lib/supabase';

const db = () => getServiceClient();

export async function rpc<T = unknown>(fn: string, params?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(fn, params ?? {});
  if (error) throw error;
  return data as T;
}

export async function query<T = Record<string, unknown>>(
  table: string,
  method: 'select' | 'insert' | 'update' | 'upsert' | 'delete',
  args?: Record<string, unknown>,
): Promise<T[]> {
  // @ts-expect-error dynamic method dispatch
  let q = db().from(table)[method](args?.select ?? '*');
  if (args?.eq) {
    for (const [col, val] of Object.entries(args.eq as Record<string, unknown>)) {
      q = q.eq(col, val);
    }
  }
  if (args?.match) {
    for (const [col, val] of Object.entries(args.match as Record<string, unknown>)) {
      q = q.eq(col, val);
    }
  }
  if (args?.order) {
    q = q.order(args.order as string, { ascending: (args.ascending as boolean) ?? true });
  }
  if (args?.limit) {
    q = q.limit(args.limit as number);
  }
  if (args?.maybeSingle) {
    q = q.maybeSingle();
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function querySingle<T = Record<string, unknown>>(
  table: string,
  match: Record<string, unknown>,
): Promise<T | null> {
  let q = db().from(table).select('*');
  for (const [col, val] of Object.entries(match)) {
    q = q.eq(col, val);
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return (data ?? null) as T | null;
}

export async function insert(table: string, row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await db().from(table).insert(row).select('*').single();
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function update(
  table: string,
  match: Record<string, unknown>,
  updates: Record<string, unknown>,
): Promise<void> {
  let q = db().from(table).update(updates);
  for (const [col, val] of Object.entries(match)) {
    q = q.eq(col, val);
  }
  const { error } = await q;
  if (error) throw error;
}
