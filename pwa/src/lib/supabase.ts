import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let anonClient: SupabaseClient | undefined;

function getAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required'
    );
  }
  if (!anonClient) {
    anonClient = createClient(url, key);
  }
  return anonClient;
}

/** Клиент для клиентского кода (anon, RLS). Ленивая инициализация — без падения сборки без env. */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const c = getAnonClient();
    const value = Reflect.get(c as unknown as object, prop, receiver);
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(c);
    }
    return value;
  },
});

/** Клиент для серверного кода (обходит RLS) */
export function getServiceClient() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }
  return createClient(url, supabaseServiceKey);
}
