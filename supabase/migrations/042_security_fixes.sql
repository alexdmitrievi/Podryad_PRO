-- =============================================================================
-- Migration 042: Production hardening — RLS gaps, FK ON DELETE, region indexes
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RLS on revoked_sessions (currently NO RLS — critical security gap)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.revoked_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revoked_sessions_service_all" ON public.revoked_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Index for auto-cleanup
CREATE INDEX IF NOT EXISTS idx_revoked_expires ON public.revoked_sessions(expires_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. contact_requests: RLS enabled but 0 policies → unusable via PostgREST
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "contact_requests_service_all" ON public.contact_requests;
CREATE POLICY "contact_requests_service_all" ON public.contact_requests
  FOR ALL USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FK ON DELETE CASCADE / SET NULL fixes (10 relationships)
-- ─────────────────────────────────────────────────────────────────────────────

-- 3a. workers → users: SET NULL (worker stays without PWA-user link)
ALTER TABLE public.workers
  DROP CONSTRAINT IF EXISTS workers_user_phone_fkey;
ALTER TABLE public.workers
  ADD CONSTRAINT workers_user_phone_fkey FOREIGN KEY (user_phone)
    REFERENCES public.users(phone) ON DELETE SET NULL;

-- 3b. orders.supplier_id → suppliers: SET NULL
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_supplier_id_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_supplier_id_fkey FOREIGN KEY (supplier_id)
    REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- 3c. orders.contractor_id → contractors: SET NULL
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_contractor_id_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_contractor_id_fkey FOREIGN KEY (contractor_id)
    REFERENCES public.contractors(id) ON DELETE SET NULL;

-- 3d. orders.customer_account_id → customers: SET NULL
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_customer_account_id_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_customer_account_id_fkey FOREIGN KEY (customer_account_id)
    REFERENCES public.customers(id) ON DELETE SET NULL;

-- 3e. rentals.equipment_id → equipment: CASCADE (rental without equipment = meaningless)
ALTER TABLE public.rentals
  DROP CONSTRAINT IF EXISTS rentals_equipment_id_fkey;
ALTER TABLE public.rentals
  ADD CONSTRAINT rentals_equipment_id_fkey FOREIGN KEY (equipment_id)
    REFERENCES public.equipment(equipment_id) ON DELETE CASCADE;

-- 3f. disputes.order_id → orders: CASCADE (dispute without order = meaningless)
ALTER TABLE public.disputes
  DROP CONSTRAINT IF EXISTS disputes_order_id_fkey;
ALTER TABLE public.disputes
  ADD CONSTRAINT disputes_order_id_fkey FOREIGN KEY (order_id)
    REFERENCES public.orders(order_id) ON DELETE CASCADE;

-- 3g. listings.category_slug → marketplace_categories: SET NULL
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_category_slug_fkey;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_category_slug_fkey FOREIGN KEY (category_slug)
    REFERENCES public.marketplace_categories(slug) ON DELETE SET NULL;

-- 3h. bot_leads.service_id → bot_services: SET NULL (services readonly, но safety net)
ALTER TABLE public.bot_leads
  DROP CONSTRAINT IF EXISTS bot_leads_service_id_fkey;
ALTER TABLE public.bot_leads
  ADD CONSTRAINT bot_leads_service_id_fkey FOREIGN KEY (service_id)
    REFERENCES public.bot_services(id) ON DELETE SET NULL;

-- 3i. material_orders.grade_id → material_grades: SET NULL
ALTER TABLE public.material_orders
  DROP CONSTRAINT IF EXISTS material_orders_grade_id_fkey;
ALTER TABLE public.material_orders
  ADD CONSTRAINT material_orders_grade_id_fkey FOREIGN KEY (grade_id)
    REFERENCES public.material_grades(id) ON DELETE SET NULL;

-- 3j. referrals.referral_code_id → referral_codes: SET NULL
ALTER TABLE public.referrals
  DROP CONSTRAINT IF EXISTS referrals_referral_code_id_fkey;
ALTER TABLE public.referrals
  ADD CONSTRAINT referrals_referral_code_id_fkey FOREIGN KEY (referral_code_id)
    REFERENCES public.referral_codes(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Missing FK: bot_leads.order_id → orders(order_id) — critical bridge
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.bot_leads
    ADD CONSTRAINT bot_leads_order_id_fkey FOREIGN KEY (order_id)
      REFERENCES public.orders(order_id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.material_orders
    ADD CONSTRAINT material_orders_order_id_fkey FOREIGN KEY (order_id)
      REFERENCES public.orders(order_id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Missing FK: bot_sessions.contact_id → bot_contacts
DO $$ BEGIN
  ALTER TABLE public.bot_sessions
    ADD CONSTRAINT bot_sessions_contact_id_fkey FOREIGN KEY (contact_id)
      REFERENCES public.bot_contacts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Missing FK: payments.order_id → orders(order_id)
DO $$ BEGIN
  ALTER TABLE public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id)
      REFERENCES public.orders(order_id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Missing FK: contact_requests.listing_id → listings
ALTER TABLE public.contact_requests
  DROP CONSTRAINT IF EXISTS contact_requests_listing_id_fkey;
ALTER TABLE public.contact_requests
  ADD CONSTRAINT contact_requests_listing_id_fkey FOREIGN KEY (listing_id)
    REFERENCES public.listings(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Region indexes (added in migration 039, no indexes → table scans)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bot_contacts_region ON public.bot_contacts(region);
CREATE INDEX IF NOT EXISTS idx_bot_leads_region ON public.bot_leads(region);
CREATE INDEX IF NOT EXISTS idx_material_orders_region ON public.material_orders(region);
CREATE INDEX IF NOT EXISTS idx_subscriptions_region ON public.subscriptions(region);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Composite indexes for common admin queries
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_payment_status_created
  ON public.orders(payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_executor_payout_created
  ON public.orders(executor_payout_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_channel_created
  ON public.events(channel, created_at DESC);
