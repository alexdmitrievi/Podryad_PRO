CREATE OR REPLACE FUNCTION public.create_material_order(
  p_contact_id UUID,
  p_material_code TEXT,
  p_grade TEXT,
  p_quantity NUMERIC,
  p_unit TEXT,
  p_delivery_address TEXT DEFAULT NULL,
  p_desired_date TEXT DEFAULT NULL,
  p_region region_name DEFAULT 'omsk'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_grade_id UUID;
  v_order_id UUID;
  v_price NUMERIC;
BEGIN
  SELECT mg.id, mg.price_per_unit INTO v_grade_id, v_price
    FROM public.material_grades mg
    JOIN public.materials m ON m.id = mg.material_id
   WHERE m.code = p_material_code AND mg.grade = p_grade;

  IF v_grade_id IS NULL THEN
    RAISE EXCEPTION 'grade not found: % / %', p_material_code, p_grade;
  END IF;

  INSERT INTO public.material_orders (
    contact_id, grade_id, quantity, unit, price_per_unit, total_price,
    delivery_address, description, status, region
  ) VALUES (
    p_contact_id, v_grade_id, p_quantity, p_unit, v_price,
    ROUND(v_price * p_quantity, 2),
    p_delivery_address,
    'Заказ через бота. Желаемая дата: ' || COALESCE(p_desired_date, 'не указана'),
    'new', p_region
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.events (type, contact_id, channel, payload)
  VALUES ('material_order.created', p_contact_id, 'telegram',
          jsonb_build_object('material_order_id', v_order_id, 'material', p_material_code, 'grade', p_grade, 'qty', p_quantity, 'unit', p_unit));

  RETURN v_order_id;
END $$;

REVOKE ALL ON FUNCTION public.create_material_order(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, region_name) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_material_order(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, region_name) TO service_role;
