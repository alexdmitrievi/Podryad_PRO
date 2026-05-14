-- =============================================================================
-- Migration 048: Tighten orders RLS — explicit role checks, no broad SELECT
-- =============================================================================
-- Problem: orders_select_published allowed ANY role to SELECT published orders
-- via PostgREST. While functionally correct (filtered to published only), this
-- exposes count/metadata via direct REST API calls. We want:
--   - anon: SELECT only published orders (for public map/feed)
--   - authenticated: SELECT own orders (by phone in JWT)
--   - service_role: full access (bypasses RLS entirely)
-- =============================================================================

-- ── 1. Drop old broad policies ───────────────────────────────────────────────
DROP POLICY IF EXISTS "orders_select_published" ON public.orders;
DROP POLICY IF EXISTS "orders_service_all" ON public.orders;

-- ── 2. Recreate with explicit role checks ────────────────────────────────────

-- anon: can read only published orders (for public map/live feed)
CREATE POLICY "orders_anon_select_published" ON public.orders
  FOR SELECT
  USING (auth.role() = 'anon' AND status = 'published');

-- authenticated: can read own orders (customer by phone, contractor via FK)
CREATE POLICY "orders_auth_select_own" ON public.orders
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      customer_phone = (auth.jwt() ->> 'phone')
      OR contractor_id IN (
        SELECT id FROM public.contractors WHERE phone = (auth.jwt() ->> 'phone')
      )
    )
  );

-- authenticated: can create orders (customer submits)
CREATE POLICY "orders_auth_insert" ON public.orders
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND customer_phone = (auth.jwt() ->> 'phone')
  );

-- authenticated: can update own orders (confirm, cancel before in_progress)
CREATE POLICY "orders_auth_update_own" ON public.orders
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (
      customer_phone = (auth.jwt() ->> 'phone')
      OR contractor_id IN (
        SELECT id FROM public.contractors WHERE phone = (auth.jwt() ->> 'phone')
      )
    )
  );

-- service_role: full access (explicit, though Supabase bypasses RLS for this role)
CREATE POLICY "orders_service_all" ON public.orders
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 3. Verify RLS is enabled ─────────────────────────────────────────────────
-- (idempotent — no error if already enabled)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ── 4. Add index to support the new auth queries ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone)
  WHERE customer_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_contractor_id ON public.orders(contractor_id)
  WHERE contractor_id IS NOT NULL;
