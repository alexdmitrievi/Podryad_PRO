-- =============================================================================
-- Migration 043: Bridge views — bot_leads ↔ orders unified
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. v_unified_orders — UNION bot_orders + pwa_orders for "My Orders" screen
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_unified_bot_orders AS
SELECT
  l.id,
  l.contact_id,
  l.service_kind::text AS work_type,
  s.name AS work_type_label,
  l.area_value,
  l.area_unit,
  l.district,
  l.desired_date_from,
  l.desired_date_to,
  l.status::text,
  l.price_quoted AS display_price,
  l.price_final,
  l.discount_percent,
  l.discount_rub,
  l.order_id,
  l.region,
  l.created_at,
  l.completed_at,
  'bot' AS source
FROM public.bot_leads l
JOIN public.bot_services s ON s.id = l.service_id
WHERE l.deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. v_bridge_bot_leads_orders — all bot_leads with their linked orders
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_bridge_bot_leads_orders AS
SELECT
  bl.id AS bot_lead_id,
  bl.service_kind,
  bl.contact_id,
  bl.status AS lead_status,
  bl.area_value,
  bl.district,
  bl.region,
  bl.order_id,
  o.order_number,
  o.status AS order_status,
  o.display_price,
  o.work_type,
  o.created_at AS order_created_at,
  bl.created_at AS lead_created_at
FROM public.bot_leads bl
LEFT JOIN public.orders o ON o.order_id = bl.order_id
WHERE bl.deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. v_material_orders_detail — material orders with full info
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_material_orders_detail AS
SELECT
  mo.id,
  mo.contact_id,
  c.full_name,
  c.phone,
  m.code AS material_code,
  m.name AS material_name,
  mg.grade,
  mg.description AS grade_description,
  mo.quantity,
  mo.unit,
  mo.price_per_unit,
  mo.total_price,
  mo.delivery_address,
  mo.status,
  mo.region,
  mo.order_id,
  mo.created_at,
  mo.updated_at
FROM public.material_orders mo
JOIN public.material_grades mg ON mg.id = mo.grade_id
JOIN public.materials m ON m.id = mg.material_id
JOIN public.bot_contacts c ON c.id = mo.contact_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RPC: link_bot_lead_to_order — set order_id on bot_lead after conversion
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.link_bot_lead_to_order(
  p_lead_id UUID,
  p_order_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.bot_leads
     SET order_id = p_order_id,
         updated_at = now()
   WHERE id = p_lead_id;
END $$;

REVOKE ALL ON FUNCTION public.link_bot_lead_to_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_bot_lead_to_order(UUID, TEXT) TO service_role;
