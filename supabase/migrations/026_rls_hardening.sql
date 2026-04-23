-- Migration 026: RLS hardening — close UNRESTRICTED tables + pin function search_path
-- 2026-04-23
--
-- Issues from Supabase advisor (ERROR level):
-- 1. public.customers, public.markup_rates, public.material_requests have RLS
--    DISABLED. With anon key (published in client JS), ANY caller can SELECT,
--    UPDATE, DELETE on these tables via PostgREST. customers contains
--    password_hash + PII — critical leak.
-- 2. 5 functions have mutable search_path (WARN) — possible privilege
--    escalation if a malicious schema shadows public.
--
-- Strategy: enable RLS with NO policies. Service-role bypasses RLS by default
-- in Supabase, so backend API routes (which use SUPABASE_SERVICE_ROLE_KEY)
-- continue to work unchanged. Anon clients lose all access — exactly what we
-- want for these internal-only tables.

-- ── 1. customers (PII + auth credentials) ───────────────────────────────
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ── 2. markup_rates (business-sensitive markup %) ───────────────────────
ALTER TABLE public.markup_rates ENABLE ROW LEVEL SECURITY;

-- ── 3. material_requests (legacy, not currently called, but exposed) ────
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;

-- ── 4. Pin search_path on SECURITY-sensitive functions ──────────────────
-- A mutable search_path lets an attacker with CREATE on any schema
-- shadow public.<table> and hijack function execution.

ALTER FUNCTION public.set_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.assign_order_number()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_customers_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.increment_listing_views(p_listing_id TEXT)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.increment_listing_contacts(p_listing_id TEXT)
  SET search_path = public, pg_temp;
