-- =============================================================================
-- Migration 045: единый view "Мои заказы" — услуги + материалы
-- =============================================================================
-- Используется ботами и PWA для раздела "Мои заказы".
-- Старые view'ы (v_my_bot_orders, v_unified_bot_orders, v_material_orders_detail)
-- НЕ трогаем — на них ссылается PWA.
-- =============================================================================

CREATE OR REPLACE VIEW public.v_my_all_orders
WITH (security_invoker = true) AS
SELECT
  'service'::text                              AS kind,
  l.id                                         AS id,
  l.contact_id                                 AS contact_id,
  ('B-' || UPPER(LEFT(l.id::text, 6)))         AS human_id,
  s.short_name                                 AS title,
  l.status::text                               AS status,
  l.region                                     AS region,
  l.district                                   AS district,
  l.desired_date_from                          AS desired_date_from,
  l.desired_date_to                            AS desired_date_to,
  l.price_quoted                               AS price_quoted,
  l.price_final                                AS price_final,
  l.discount_percent                           AS discount_percent,
  l.created_at                                 AS created_at,
  l.completed_at                               AS completed_at,
  l.order_id                                   AS external_order_id
FROM public.bot_leads l
LEFT JOIN public.bot_services s ON s.id = l.service_id
WHERE l.deleted_at IS NULL

UNION ALL

SELECT
  'material'::text                             AS kind,
  mo.id                                        AS id,
  mo.contact_id                                AS contact_id,
  ('M-' || UPPER(LEFT(mo.id::text, 6)))        AS human_id,
  (m.name || ' ' || COALESCE(mg.grade, ''))    AS title,
  mo.status                                    AS status,
  mo.region                                    AS region,
  NULL::text                                   AS district,
  NULL::date                                   AS desired_date_from,
  NULL::date                                   AS desired_date_to,
  mo.price_per_unit                            AS price_quoted,
  mo.total_price                               AS price_final,
  0                                            AS discount_percent,
  mo.created_at                                AS created_at,
  NULL::timestamptz                            AS completed_at,
  mo.order_id                                  AS external_order_id
FROM public.material_orders mo
LEFT JOIN public.material_grades mg ON mg.id = mo.grade_id
LEFT JOIN public.materials m ON m.id = mg.material_id;

COMMENT ON VIEW public.v_my_all_orders IS
  'Единый список заказов клиента (услуги bot_leads + материалы material_orders). '
  'Используется ботами и PWA в разделе "Мои заказы". '
  'security_invoker = true — RLS применяется на нижележащих таблицах.';
