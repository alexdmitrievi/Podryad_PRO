-- 052: Fix record_referral_visit to return referrer NAME instead of UUID
-- Replace the function to JOIN bot_contacts and return full_name

DROP FUNCTION IF EXISTS public.record_referral_visit(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.record_referral_visit(
  p_invitee_contact_id UUID,
  p_code TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rc RECORD;
  v_id UUID;
  v_referrer_name TEXT;
BEGIN
  SELECT * INTO v_rc FROM public.referral_codes WHERE code = p_code AND is_active;
  IF v_rc.id IS NULL THEN RETURN NULL; END IF;
  IF v_rc.contact_id = p_invitee_contact_id THEN RETURN NULL; END IF;

  INSERT INTO public.referrals (referrer_contact_id, invitee_contact_id, referral_code_id, status)
  VALUES (v_rc.contact_id, p_invitee_contact_id, v_rc.id, 'pending')
  ON CONFLICT (invitee_contact_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN RETURN NULL; END IF;

  SELECT full_name INTO v_referrer_name FROM public.bot_contacts WHERE id = v_rc.contact_id;
  RETURN COALESCE(v_referrer_name, 'Пользователь');
END $$;

REVOKE ALL ON FUNCTION public.record_referral_visit(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_referral_visit(UUID, TEXT) TO service_role;
