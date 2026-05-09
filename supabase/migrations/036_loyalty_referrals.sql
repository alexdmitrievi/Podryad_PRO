-- =============================================================================
-- Migration 036: Loyalty system + referral codes
-- Интеграция Premium → Подряд PRO
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Таблица: referral_codes — 1-к-1 с bot_contacts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID NOT NULL UNIQUE REFERENCES public.bot_contacts(id) ON DELETE CASCADE,
  code        TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.referral_codes IS 'Реферальный код контакта. Один контакт — один код.';

-- ---------------------------------------------------------------------------
-- Таблица: referrals — реферальные связи
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_contact_id    UUID NOT NULL REFERENCES public.bot_contacts(id) ON DELETE CASCADE,
  invitee_contact_id     UUID NOT NULL REFERENCES public.bot_contacts(id) ON DELETE CASCADE,
  referral_code_id       UUID NOT NULL REFERENCES public.referral_codes(id),
  qualifying_lead_id     UUID REFERENCES public.bot_leads(id) ON DELETE SET NULL,
  status                 referral_status NOT NULL DEFAULT 'pending',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  qualified_at           TIMESTAMPTZ,
  UNIQUE (invitee_contact_id),
  CHECK (referrer_contact_id <> invitee_contact_id)
);

COMMENT ON TABLE public.referrals IS 'Связи: кто кого пригласил. invitee уникален — anti-self-invite + first-touch wins.';

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_contact_id, status);

-- FK от bot_leads.referral_id к referrals
ALTER TABLE public.bot_leads
  DROP CONSTRAINT IF EXISTS bot_leads_referral_fk;
ALTER TABLE public.bot_leads
  ADD CONSTRAINT bot_leads_referral_fk FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Таблица: loyalty_balances — бонусный баланс
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_balances (
  contact_id  UUID PRIMARY KEY REFERENCES public.bot_contacts(id) ON DELETE CASCADE,
  bonus_rub   INT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (bonus_rub >= 0)
);

COMMENT ON TABLE public.loyalty_balances IS 'Текущий бонусный баланс контакта в рублях.';

-- ---------------------------------------------------------------------------
-- Таблица: loyalty_events — история бонусных операций
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_events (
  id                  BIGSERIAL PRIMARY KEY,
  contact_id          UUID NOT NULL REFERENCES public.bot_contacts(id) ON DELETE CASCADE,
  delta_rub           INT NOT NULL,
  reason              TEXT NOT NULL,
  related_lead_id     UUID REFERENCES public.bot_leads(id) ON DELETE SET NULL,
  related_referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_events_contact ON public.loyalty_events(contact_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Триггер: bump_total_orders при lead.status = 'done'
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_bump_total_orders()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (tg_op = 'UPDATE' AND new.status = 'done' AND old.status IS DISTINCT FROM 'done') THEN
    UPDATE public.bot_contacts
       SET total_orders  = total_orders + 1,
           last_order_at = COALESCE(new.completed_at, now())
     WHERE id = new.contact_id;
  END IF;
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS bump_total_orders ON public.bot_leads;
CREATE TRIGGER bump_total_orders
  AFTER UPDATE ON public.bot_leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_total_orders();

-- ---------------------------------------------------------------------------
-- Триггер: при первом done у invitee — квалифицируем реферала
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_qualify_referral_on_done()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_first_done BOOLEAN;
BEGIN
  IF (tg_op = 'UPDATE' AND new.status = 'done' AND old.status IS DISTINCT FROM 'done') THEN
    PERFORM 1 FROM public.referrals
      WHERE invitee_contact_id = new.contact_id AND status = 'pending';
    IF FOUND THEN
      SELECT COUNT(*) = 0 INTO v_first_done
        FROM public.bot_leads
       WHERE contact_id = new.contact_id
         AND status = 'done'
         AND id <> new.id
         AND completed_at IS NOT NULL;
      IF v_first_done THEN
        PERFORM public.qualify_referral(new.contact_id, new.id, 500);
      END IF;
    END IF;
  END IF;
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS qualify_referral_on_done ON public.bot_leads;
CREATE TRIGGER qualify_referral_on_done
  AFTER UPDATE ON public.bot_leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_qualify_referral_on_done();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_codes_service_all" ON public.referral_codes
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "referrals_service_all" ON public.referrals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "loyalty_balances_service_all" ON public.loyalty_balances
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "loyalty_events_service_all" ON public.loyalty_events
  FOR ALL USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- RPC: ensure_referral_code — создаёт или возвращает код контакта
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_referral_code(p_contact_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_code TEXT;
BEGIN
  SELECT code INTO v_code FROM public.referral_codes WHERE contact_id = p_contact_id;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;

  FOR i IN 1..5 LOOP
    v_code := UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FOR 6));
    BEGIN
      INSERT INTO public.referral_codes (contact_id, code) VALUES (p_contact_id, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;
  RAISE EXCEPTION 'failed to generate unique referral code';
END $$;

REVOKE ALL ON FUNCTION public.ensure_referral_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_referral_code(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: record_referral_visit — обработка deep-link ref_<code>
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_referral_visit(
  p_invitee_contact_id UUID,
  p_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_rc RECORD; v_id UUID;
BEGIN
  SELECT * INTO v_rc FROM public.referral_codes WHERE code = p_code AND is_active;
  IF v_rc.id IS NULL THEN RETURN NULL; END IF;
  IF v_rc.contact_id = p_invitee_contact_id THEN RETURN NULL; END IF;

  INSERT INTO public.referrals (referrer_contact_id, invitee_contact_id, referral_code_id, status)
  VALUES (v_rc.contact_id, p_invitee_contact_id, v_rc.id, 'pending')
  ON CONFLICT (invitee_contact_id) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.record_referral_visit(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_referral_visit(UUID, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: grant_bonus — начисление бонусов
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_bonus(
  p_contact_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_lead_id UUID DEFAULT NULL,
  p_ref_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_amount <= 0 THEN RETURN; END IF;

  INSERT INTO public.loyalty_balances (contact_id, bonus_rub)
  VALUES (p_contact_id, p_amount)
  ON CONFLICT (contact_id) DO UPDATE
    SET bonus_rub = public.loyalty_balances.bonus_rub + EXCLUDED.bonus_rub,
        updated_at = now();

  INSERT INTO public.loyalty_events (contact_id, delta_rub, reason, related_lead_id, related_referral_id)
  VALUES (p_contact_id, p_amount, p_reason, p_lead_id, p_ref_id);
END $$;

REVOKE ALL ON FUNCTION public.grant_bonus(UUID, INT, TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_bonus(UUID, INT, TEXT, UUID, UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: spend_bonus — списание бонусов
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spend_bonus(
  p_contact_id UUID,
  p_amount INT,
  p_lead_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_balance INT; v_used INT;
BEGIN
  IF p_amount <= 0 THEN RETURN 0; END IF;

  SELECT bonus_rub INTO v_balance
    FROM public.loyalty_balances
   WHERE contact_id = p_contact_id
   FOR UPDATE;

  v_balance := COALESCE(v_balance, 0);
  IF v_balance <= 0 THEN RETURN 0; END IF;

  v_used := LEAST(v_balance, p_amount);

  UPDATE public.loyalty_balances
     SET bonus_rub = bonus_rub - v_used, updated_at = now()
   WHERE contact_id = p_contact_id;

  INSERT INTO public.loyalty_events (contact_id, delta_rub, reason, related_lead_id)
  VALUES (p_contact_id, -v_used, 'order_applied', p_lead_id);

  RETURN v_used;
END $$;

REVOKE ALL ON FUNCTION public.spend_bonus(UUID, INT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spend_bonus(UUID, INT, UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: refund_bonus — возврат бонусов при отмене заказа
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refund_bonus(p_lead_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_used INT; v_contact UUID;
BEGIN
  SELECT SUM(-delta_rub), MAX(contact_id) INTO v_used, v_contact
    FROM public.loyalty_events
   WHERE related_lead_id = p_lead_id AND reason = 'order_applied';

  IF v_used IS NULL OR v_used <= 0 OR v_contact IS NULL THEN RETURN; END IF;

  UPDATE public.loyalty_balances
     SET bonus_rub = bonus_rub + v_used, updated_at = now()
   WHERE contact_id = v_contact;

  INSERT INTO public.loyalty_events (contact_id, delta_rub, reason, related_lead_id)
  VALUES (v_contact, v_used, 'refund', p_lead_id);
END $$;

REVOKE ALL ON FUNCTION public.refund_bonus(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_bonus(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: qualify_referral — квалификация реферала (ручной вызов или из триггера)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.qualify_referral(
  p_invitee_contact_id UUID,
  p_lead_id UUID,
  p_bonus_rub INT DEFAULT 500
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_ref RECORD;
BEGIN
  SELECT * INTO v_ref FROM public.referrals
   WHERE invitee_contact_id = p_invitee_contact_id AND status = 'pending'
   FOR UPDATE;

  IF v_ref.id IS NULL THEN RETURN; END IF;

  UPDATE public.referrals
     SET status = 'qualified', qualified_at = now(), qualifying_lead_id = p_lead_id
   WHERE id = v_ref.id;

  PERFORM public.grant_bonus(v_ref.referrer_contact_id, p_bonus_rub, 'referral_qualified', NULL, v_ref.id);
  PERFORM public.grant_bonus(v_ref.invitee_contact_id,  p_bonus_rub, 'referral_qualified', NULL, v_ref.id);
END $$;

REVOKE ALL ON FUNCTION public.qualify_referral(UUID, UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qualify_referral(UUID, UUID, INT) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: compute_discount_for_contact
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_discount_for_contact(
  p_contact_id UUID
)
RETURNS TABLE (percent INT, rub_bonus INT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_orders INT; v_balance INT;
BEGIN
  SELECT COUNT(*) INTO v_orders
    FROM public.bot_leads l
   WHERE l.contact_id = p_contact_id
     AND l.status = 'done'
     AND l.completed_at IS NOT NULL
     AND l.completed_at >= date_trunc('year', now());

  SELECT bonus_rub INTO v_balance FROM public.loyalty_balances WHERE contact_id = p_contact_id;
  v_balance := COALESCE(v_balance, 0);

  IF v_orders >= 2 THEN
    percent := 10;
  ELSIF v_orders = 1 THEN
    percent := 5;
  ELSE
    percent := 0;
  END IF;
  rub_bonus := v_balance;
  RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION public.compute_discount_for_contact(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_discount_for_contact(UUID) TO service_role;
