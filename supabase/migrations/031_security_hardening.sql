-- ============================================================================
-- 031_security_hardening.sql
-- Session revoke-list, admin multi-user, admin audit-log
-- ============================================================================

-- ── REVOKED SESSIONS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS revoked_sessions (
  jti_hash   TEXT PRIMARY KEY,          -- SHA-256(first 64 chars of session token)
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL       -- auto-cleanup after this time
);

CREATE INDEX IF NOT EXISTS idx_revoked_expires ON revoked_sessions(expires_at);

-- Auto-clean expired revocations (PG_CRON or manual VACUUM)
-- Run periodically: DELETE FROM revoked_sessions WHERE expires_at < now();

-- ── ADMIN USERS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_users (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username     TEXT NOT NULL UNIQUE,
  pin_hash     TEXT NOT NULL,           -- scrypt hash (same format as users.password_hash)
  role         TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  last_login   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: only service_role
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_users_service_all" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- ── ADMIN AUDIT LOG ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id       TEXT,                   -- admin user id (or 'pin' for legacy env var)
  admin_username TEXT,                   -- admin username (or null for legacy)
  action         TEXT NOT NULL,          -- HTTP method + path (e.g. 'PUT /api/admin/orders/...')
  endpoint       TEXT NOT NULL,          -- full pathname
  ip_address     TEXT,                   -- client IP
  user_agent     TEXT,                   -- User-Agent header (truncated)
  details        JSONB DEFAULT '{}',     -- extra metadata
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_service_all" ON admin_audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- ── EXTEND orders.status constraint to include newer statuses ────────────────
-- (existing constraint only allows old statuses; migration 023 fixed it partially)
-- This is a no-op if already applied, but ensures correctness.

DO $$
BEGIN
  -- Drop old check constraint if it exists (idempotent)
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
  ALTER TABLE orders ADD CONSTRAINT orders_status_check
    CHECK (status IN (
      'pending', 'priced', 'payment_sent', 'paid',
      'in_progress', 'confirming', 'completed',
      'disputed', 'cancelled', 'published', 'closed', 'done'
    ));
EXCEPTION WHEN duplicate_object THEN
  -- constraint already exists, skip
END $$;
