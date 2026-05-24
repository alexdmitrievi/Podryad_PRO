-- 051: resolve_bot_context — combines 3 sequential DB calls into 1
-- Replaces: upsert_bot_contact_by_identity + get_or_create_bot_session + getContactProfile
-- Reduces cold-start latency from ~300ms (3 HTTP roundtrips) to ~100ms (1 roundtrip)

CREATE OR REPLACE FUNCTION public.resolve_bot_context(
  p_channel         messenger_channel,
  p_external_id     TEXT,
  p_chat_id         TEXT,
  p_username        TEXT DEFAULT NULL,
  p_display_name    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_identity_id UUID;
  v_contact_id  UUID;
  v_is_new      BOOLEAN := false;
  v_session     JSONB;
  v_region      TEXT;
  v_customer_type TEXT;
BEGIN
  -- Step 1: Upsert contact identity (was upsert_bot_contact_by_identity)
  SELECT ci.id, ci.contact_id
    INTO v_identity_id, v_contact_id
    FROM public.bot_contact_identities ci
   WHERE ci.channel = p_channel AND ci.external_id = p_external_id;

  IF v_identity_id IS NULL THEN
    INSERT INTO public.bot_contacts (full_name, preferred_channel)
    VALUES (COALESCE(p_display_name, p_username), p_channel)
    RETURNING id INTO v_contact_id;

    INSERT INTO public.bot_contact_identities (contact_id, channel, external_id, username, display_name)
    VALUES (v_contact_id, p_channel, p_external_id, p_username, p_display_name)
    RETURNING id INTO v_identity_id;

    v_is_new := true;
  ELSE
    UPDATE public.bot_contact_identities
       SET username     = COALESCE(p_username, username),
           display_name = COALESCE(p_display_name, display_name),
           updated_at   = now()
     WHERE id = v_identity_id;
  END IF;

  -- Step 2: Fetch contact profile (was getContactProfile)
  SELECT c.region, c.customer_type
    INTO v_region, v_customer_type
    FROM public.bot_contacts c
   WHERE c.id = v_contact_id;

  -- Step 3: Get or create session (was get_or_create_bot_session)
  SELECT jsonb_build_object(
    'id', bs.id,
    'chat_id', bs.chat_id,
    'channel', bs.channel,
    'contact_id', bs.contact_id,
    'funnel', bs.funnel,
    'step', bs.step,
    'state', bs.state
  ) INTO v_session
  FROM public.bot_sessions bs
  WHERE bs.chat_id = p_chat_id AND bs.channel = p_channel;

  IF v_session IS NULL THEN
    INSERT INTO public.bot_sessions (chat_id, channel, contact_id, funnel, step, state)
    VALUES (p_chat_id, p_channel, v_contact_id, '', 'start', '{}'::jsonb)
    RETURNING jsonb_build_object(
      'id', bot_sessions.id,
      'chat_id', bot_sessions.chat_id,
      'channel', bot_sessions.channel,
      'contact_id', bot_sessions.contact_id,
      'funnel', bot_sessions.funnel,
      'step', bot_sessions.step,
      'state', bot_sessions.state
    ) INTO v_session;
  END IF;

  RETURN jsonb_build_object(
    'contact_id',    v_contact_id,
    'identity_id',   v_identity_id,
    'is_new',        v_is_new,
    'region',        COALESCE(v_region, 'omsk'),
    'customer_type', v_customer_type,
    'session',       v_session
  );
END $$;

REVOKE ALL ON FUNCTION public.resolve_bot_context(messenger_channel, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_bot_context(messenger_channel, TEXT, TEXT, TEXT, TEXT) TO service_role;
