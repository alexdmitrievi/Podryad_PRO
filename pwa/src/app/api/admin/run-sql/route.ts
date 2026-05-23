import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import dns from 'dns';
import { Pool } from 'pg';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

async function resolveHost(host: string): Promise<string> {
  return new Promise((resolve, reject) => {
    dns.resolve6(host, (err, addresses) => {
      if (err || !addresses.length) {
        dns.resolve4(host, (err4, addrs4) => {
          if (err4 || !addrs4.length) reject(new Error(`DNS failed: ${err?.message ?? 'no records'}`));
          else resolve(addrs4[0]);
        });
      } else {
        resolve(addresses[0]);
      }
    });
  });
}

export async function POST(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const hostname = process.env.SUPABASE_DB_HOST ?? 'db.rnqalafmuyrlfioqdore.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  let ip: string;
  try {
    ip = await resolveHost(hostname);
    console.log(`[run-sql] Resolved ${hostname} -> ${ip}`);
  } catch (e) {
    console.error(`[run-sql] DNS failed for ${hostname}: ${e}`);
    return NextResponse.json({ error: `DNS resolution failed for ${hostname}` }, { status: 500 });
  }

  // Migration SQL
  const sql = `
CREATE TABLE IF NOT EXISTS public.invite_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           TEXT NOT NULL,
  label           TEXT NOT NULL,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_lists
  ADD COLUMN IF NOT EXISTS inviter_account_id UUID
  REFERENCES public.invite_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.invite_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "invite_accounts_service_all" ON public.invite_accounts
  FOR ALL USING (auth.role() = 'service_role');
`;

  const pool = new Pool({
    host: ip,
    port: 5432,
    user: 'postgres',
    password: key,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 15000,
  });

  try {
    const client = await pool.connect();
    try {
      console.log('[run-sql] Connected, executing migration...');
      await client.query(sql);
      console.log('[run-sql] Migration 050 applied successfully');
      return NextResponse.json({ ok: true, message: 'Migration 050 applied' });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[run-sql] Error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
