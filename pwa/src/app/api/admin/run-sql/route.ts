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

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

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

  const configs = [
    // Try IPv6 direct
    { host: '2a05:d018:837:ae00:6ccb:2bb5:f790:af24', port: 5432, label: 'IPv6 direct' },
    // Try API host on Postgres port
    { host: 'rnqalafmuyrlfioqdore.supabase.co', port: 5432, label: 'API host:5432' },
    { host: 'rnqalafmuyrlfioqdore.supabase.co', port: 6543, label: 'API host:6543' },
    // Try various poolers
    { host: 'aws-0-us-east-1.pooler.supabase.com', port: 6543, label: 'Pooler us-east-1:6543' },
    { host: 'aws-0-us-east-2.pooler.supabase.com', port: 6543, label: 'Pooler us-east-2:6543' },
    { host: 'aws-0-eu-west-1.pooler.supabase.com', port: 6543, label: 'Pooler eu-west-1:6543' },
    { host: 'aws-0-eu-central-1.pooler.supabase.com', port: 5432, label: 'Pooler eu-central-1:5432' },
  ];

  const errors: string[] = [];

  for (const cfg of configs) {
    try {
      const pool = new Pool({
        host: cfg.host,
        port: cfg.port,
        user: 'postgres',
        password: key,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        max: 1,
        connectionTimeoutMillis: 8000,
      });
      const client = await pool.connect();
      try {
        await client.query(sql);
        return NextResponse.json({ ok: true, message: `Migration applied via ${cfg.label}` });
      } finally {
        client.release();
        await pool.end();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${cfg.label}: ${msg}`);
      continue;
    }
  }

  console.error('[run-sql] All connections failed:', errors);
  return NextResponse.json({ error: 'All connections failed', details: errors }, { status: 500 });
}
