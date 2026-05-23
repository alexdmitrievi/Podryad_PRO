import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { Pool } from 'pg';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

export async function POST(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const host = process.env.SUPABASE_DB_HOST ?? 'db.rnqalafmuyrlfioqdore.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

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
    host,
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
      await client.query(sql);
      return NextResponse.json({ ok: true, message: 'Migration 050 applied' });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
