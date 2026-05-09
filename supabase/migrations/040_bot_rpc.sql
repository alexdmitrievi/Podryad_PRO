-- =============================================================================
-- Migration 040: RPC functions — contacts, leads, messages, segments
-- Интеграция Premium → Подряд PRO
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RPC: upsert_bot_contact_by_identity
--   Используется вебхуками Telegram/MAX при первом контакте.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_bot_contact_by_identity(
  p_channel        messenger_channel,
  p_external_id    TEXT,
  p_username       TEXT DEFAULT NULL,
  p_display_name   TEXT DEFAULT NULL,
  p_full_name      TEXT DEFAULT NULL,
  p_phone          TEXT DEFAULT NULL,
  p_source_code    TEXT DEFAULT NULL
)
RETURNS TABLE (contact_id UUID, identity_id UUID, is_new BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_identity_id UUID;
  v_contact_id  UUID;
  v_source_id   UUID;
  v_is_new      BOOLEAN := false;
BEGIN
  IF p_source_code IS NOT NULL THEN
    SELECT id INTO v_source_id FROM public.traffic_sources WHERE code = p_source_code;
  END IF;

  SELECT ci.id, ci.contact_id INTO v_identity_id, v_contact_id
    FROM public.bot_contact_identities ci
   WHERE ci.channel = p_channel AND ci.external_id = p_external_id;

  IF v_identity_id IS NULL THEN
    INSERT INTO public.bot_contacts (full_name, phone, source_id, preferred_channel)
    VALUES (COALESCE(p_full_name, p_display_name), p_phone, v_source_id, p_channel)
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

    IF p_phone IS NOT NULL THEN
      UPDATE public.bot_contacts SET phone = p_phone WHERE id = v_contact_id AND phone IS NULL;
    END IF;
  END IF;

  RETURN QUERY SELECT v_contact_id, v_identity_id, v_is_new;
END $$;

REVOKE ALL ON FUNCTION public.upsert_bot_contact_by_identity(messenger_channel, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_bot_contact_by_identity(messenger_channel, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: create_bot_lead — создаёт заявку из бота
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_bot_lead(
  p_contact_id    UUID,
  p_service_kind  bot_service_kind,
  p_channel       messenger_channel,
  p_description   TEXT DEFAULT NULL,
  p_area_value    NUMERIC DEFAULT NULL,
  p_area_unit     TEXT DEFAULT NULL,
  p_district      TEXT DEFAULT NULL,
  p_address       TEXT DEFAULT NULL,
  p_discount_percent INT DEFAULT 0,
  p_discount_rub INT DEFAULT 0,
  p_metadata      JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_service_id UUID;
  v_lead_id    UUID;
BEGIN
  SELECT id INTO v_service_id FROM public.bot_services WHERE kind = p_service_kind;
  IF v_service_id IS NULL THEN
    RAISE EXCEPTION 'service_kind % not found', p_service_kind;
  END IF;

  INSERT INTO public.bot_leads (
    contact_id, service_id, service_kind, channel,
    description, area_value, area_unit, district, address,
    discount_percent, discount_rub, metadata
  ) VALUES (
    p_contact_id, v_service_id, p_service_kind, p_channel,
    p_description, p_area_value, p_area_unit, p_district, p_address,
    p_discount_percent, p_discount_rub, p_metadata
  ) RETURNING id INTO v_lead_id;

  INSERT INTO public.events (type, contact_id, lead_id, channel, payload)
  VALUES ('lead.created', p_contact_id, v_lead_id, p_channel,
          jsonb_build_object('service_kind', p_service_kind));

  RETURN v_lead_id;
END $$;

REVOKE ALL ON FUNCTION public.create_bot_lead(UUID, bot_service_kind, messenger_channel, TEXT, NUMERIC, TEXT, TEXT, TEXT, INT, INT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_bot_lead(UUID, bot_service_kind, messenger_channel, TEXT, NUMERIC, TEXT, TEXT, TEXT, INT, INT, JSONB) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: set_bot_lead_status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_bot_lead_status(
  p_lead_id UUID,
  p_status  bot_lead_status,
  p_actor   TEXT DEFAULT 'system'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_old bot_lead_status;
BEGIN
  SELECT status INTO v_old FROM public.bot_leads WHERE id = p_lead_id FOR UPDATE;
  IF v_old IS NULL THEN
    RAISE EXCEPTION 'lead % not found', p_lead_id;
  END IF;
  IF v_old = p_status THEN RETURN; END IF;

  UPDATE public.bot_leads
     SET status = p_status,
         updated_at = now(),
         completed_at = CASE WHEN p_status = 'done' THEN COALESCE(completed_at, now()) ELSE completed_at END
   WHERE id = p_lead_id;

  INSERT INTO public.events (type, lead_id, payload)
  VALUES ('lead.status_changed', p_lead_id,
          jsonb_build_object('from', v_old, 'to', p_status, 'actor', p_actor));
END $$;

REVOKE ALL ON FUNCTION public.set_bot_lead_status(UUID, bot_lead_status, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_bot_lead_status(UUID, bot_lead_status, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: log_bot_message — идемпотентная запись сообщения
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_bot_message(
  p_channel      messenger_channel,
  p_direction    message_direction,
  p_external_id  TEXT,
  p_contact_id   UUID DEFAULT NULL,
  p_lead_id      UUID DEFAULT NULL,
  p_kind         message_kind DEFAULT 'text',
  p_text         TEXT DEFAULT NULL,
  p_payload      JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.bot_messages (channel, direction, kind, external_id, contact_id, lead_id, text, payload)
  VALUES (p_channel, p_direction, p_kind, p_external_id, p_contact_id, p_lead_id, p_text, p_payload)
  ON CONFLICT (channel, direction, external_id) WHERE external_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.log_bot_message(messenger_channel, message_direction, TEXT, UUID, UUID, message_kind, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_bot_message(messenger_channel, message_direction, TEXT, UUID, UUID, message_kind, TEXT, JSONB) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: get_or_create_bot_session
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_bot_session(
  p_chat_id   TEXT,
  p_channel   messenger_channel,
  p_contact_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_session JSONB;
BEGIN
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
    VALUES (p_chat_id, p_channel, p_contact_id, '', 'start', '{}'::jsonb)
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

  RETURN v_session;
END $$;

REVOKE ALL ON FUNCTION public.get_or_create_bot_session(TEXT, messenger_channel, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_bot_session(TEXT, messenger_channel, UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: update_bot_session — обновление шага + состояния воронки
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_bot_session(
  p_chat_id   TEXT,
  p_channel   messenger_channel,
  p_funnel    TEXT DEFAULT NULL,
  p_step      TEXT DEFAULT NULL,
  p_state     JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.bot_sessions
     SET funnel = COALESCE(p_funnel, funnel),
         step   = COALESCE(p_step, step),
         state  = COALESCE(p_state, state),
         expires_at = now() + interval '2 hours',
         updated_at = now()
   WHERE chat_id = p_chat_id AND channel = p_channel;
END $$;

REVOKE ALL ON FUNCTION public.update_bot_session(TEXT, messenger_channel, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_bot_session(TEXT, messenger_channel, TEXT, TEXT, JSONB) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: segment_for_recurring_lawn_mowing — для n8n cron
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.segment_for_recurring_lawn_mowing(
  p_days_since     INT DEFAULT 12,
  p_campaign_code  TEXT DEFAULT 'recurring_mowing',
  p_channel        messenger_channel DEFAULT NULL
)
RETURNS TABLE (
  contact_id      UUID,
  full_name       TEXT,
  channel         messenger_channel,
  external_id     TEXT,
  last_mowing_at  TIMESTAMPTZ,
  district        TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH last_mowing AS (
    SELECT l.contact_id, MAX(l.completed_at) AS completed_at, MAX(l.district) AS district
      FROM public.bot_leads l
     WHERE l.service_kind = 'lawn_mowing'
       AND l.completed_at IS NOT NULL
       AND l.deleted_at IS NULL
     GROUP BY l.contact_id
  ),
  campaign_sent AS (
    SELECT cr.contact_id, cr.channel
      FROM public.campaign_recipients cr
      JOIN public.campaigns c ON c.id = cr.campaign_id
     WHERE c.code = p_campaign_code
       AND cr.status IN ('sent', 'pending')
       AND cr.created_at > now() - INTERVAL '20 days'
  )
  SELECT c.id, c.full_name, ci.channel, ci.external_id, lm.completed_at, lm.district
    FROM public.bot_contacts c
    JOIN last_mowing lm ON lm.contact_id = c.id
    JOIN public.bot_contact_identities ci ON ci.contact_id = c.id AND ci.is_blocked = false
   WHERE c.deleted_at IS NULL
     AND c.unsubscribed = false
     AND c.consent_marketing = true
     AND lm.completed_at < now() - make_interval(days => p_days_since)
     AND (p_channel IS NULL OR ci.channel = p_channel)
     AND NOT EXISTS (
       SELECT 1 FROM campaign_sent cs
        WHERE cs.contact_id = c.id AND cs.channel = ci.channel
     )
     AND EXTRACT(MONTH FROM now()) BETWEEN 5 AND 9;
$$;

REVOKE ALL ON FUNCTION public.segment_for_recurring_lawn_mowing(INT, TEXT, messenger_channel) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.segment_for_recurring_lawn_mowing(INT, TEXT, messenger_channel) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: segment_for_seasonal_service — универсальный сезонный сегмент
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.segment_for_seasonal_service(
  p_service_kind   bot_service_kind,
  p_campaign_code  TEXT,
  p_channel        messenger_channel DEFAULT NULL
)
RETURNS TABLE (
  contact_id   UUID,
  full_name    TEXT,
  channel      messenger_channel,
  external_id  TEXT,
  last_done_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH done AS (
    SELECT l.contact_id, MAX(l.completed_at) AS completed_at
      FROM public.bot_leads l
     WHERE l.service_kind = p_service_kind
       AND l.deleted_at IS NULL
     GROUP BY l.contact_id
  ),
  campaign_sent AS (
    SELECT cr.contact_id, cr.channel
      FROM public.campaign_recipients cr
      JOIN public.campaigns c ON c.id = cr.campaign_id
     WHERE c.code = p_campaign_code
       AND cr.created_at > now() - INTERVAL '60 days'
  ),
  service_season AS (
    SELECT s.season_months FROM public.bot_services s WHERE s.kind = p_service_kind
  )
  SELECT c.id, c.full_name, ci.channel, ci.external_id, d.completed_at
    FROM public.bot_contacts c
    JOIN done d ON d.contact_id = c.id
    JOIN public.bot_contact_identities ci ON ci.contact_id = c.id AND ci.is_blocked = false
   WHERE c.deleted_at IS NULL
     AND c.unsubscribed = false
     AND c.consent_marketing = true
     AND (p_channel IS NULL OR ci.channel = p_channel)
     AND EXISTS (
       SELECT 1 FROM service_season ss
        WHERE EXTRACT(MONTH FROM now())::int = ANY(ss.season_months)
     )
     AND NOT EXISTS (
       SELECT 1 FROM campaign_sent cs
        WHERE cs.contact_id = c.id AND cs.channel = ci.channel
     );
$$;

REVOKE ALL ON FUNCTION public.segment_for_seasonal_service(bot_service_kind, TEXT, messenger_channel) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.segment_for_seasonal_service(bot_service_kind, TEXT, messenger_channel) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: unsubscribe_bot_contact
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unsubscribe_bot_contact(
  p_contact_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.bot_contacts
     SET unsubscribed = true, unsubscribed_at = now()
   WHERE id = p_contact_id AND unsubscribed = false;
END $$;

REVOKE ALL ON FUNCTION public.unsubscribe_bot_contact(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unsubscribe_bot_contact(UUID, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: is_webhook_duplicate — проверка и запись в webhook_inbox
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_webhook_duplicate(
  p_channel     messenger_channel,
  p_external_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.webhook_inbox (channel, external_id, payload, processed_at)
  VALUES (p_channel, p_external_id, '{}'::jsonb, now())
  ON CONFLICT (channel, external_id) DO NOTHING;

  -- Если запись не вставилась (был конфликт), значит это дубликат
  RETURN NOT FOUND;
END $$;

REVOKE ALL ON FUNCTION public.is_webhook_duplicate(messenger_channel, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_webhook_duplicate(messenger_channel, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- VIEW: v_active_bot_leads — удобно для админки и n8n
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_active_bot_leads AS
SELECT
  l.id,
  l.contact_id,
  c.full_name,
  c.phone,
  l.service_kind,
  s.name AS service_name,
  l.channel,
  l.status,
  l.area_value,
  l.area_unit,
  l.district,
  l.price_quoted,
  l.price_final,
  l.discount_percent,
  l.discount_rub,
  l.order_id,
  l.last_activity_at,
  l.created_at
FROM public.bot_leads l
JOIN public.bot_contacts c ON c.id = l.contact_id
JOIN public.bot_services s ON s.id = l.service_id
WHERE l.deleted_at IS NULL AND c.deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- VIEW: v_my_bot_orders — для бота "Мои заказы"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_my_bot_orders AS
SELECT
  l.id,
  l.contact_id,
  l.service_kind,
  s.name AS service_name,
  s.short_name AS service_short,
  l.status::text,
  l.area_value,
  l.area_unit,
  l.district,
  l.desired_date_from,
  l.desired_date_to,
  l.scheduled_at,
  l.price_quoted,
  l.price_final,
  l.discount_percent,
  l.discount_rub,
  l.repeat_of,
  l.order_id,
  l.created_at,
  l.completed_at
FROM public.bot_leads l
JOIN public.bot_services s ON s.id = l.service_id
WHERE l.deleted_at IS NULL;
