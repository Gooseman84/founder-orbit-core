
-- ── Repair Block 1.3 — Canonical Bet → Money Path commit boundary ──

-- Deterministic sales_complexity derivation from committed offer evidence.
-- Returns NULL when evidence is insufficient. NEVER uses an LLM.
CREATE OR REPLACE FUNCTION public.derive_sales_complexity(
  p_business_pattern business_pattern,
  p_delivery_format  text
) RETURNS sales_complexity
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  f text := lower(coalesce(p_delivery_format, ''));
BEGIN
  -- Pattern-level rules first (unambiguous).
  IF p_business_pattern IN ('digital_product','micro_saas','licensing') THEN
    RETURN 'self_serve'::sales_complexity;
  END IF;
  IF p_business_pattern = 'cohort' THEN
    RETURN 'light_touch'::sales_complexity;
  END IF;
  IF p_business_pattern = 'advisory' THEN
    RETURN 'high_touch'::sales_complexity;
  END IF;

  -- productized_service: needs delivery_format to disambiguate.
  IF f = '' THEN
    RETURN NULL;
  END IF;
  IF f ~ '(template|async|download|self.?serve|digital|guide|kit|prewritten)' THEN
    RETURN 'self_serve'::sales_complexity;
  END IF;
  IF f ~ '(workshop|group|cohort|office.?hours|bounded|standard(ized)?)' THEN
    RETURN 'light_touch'::sales_complexity;
  END IF;
  IF f ~ '(consult|advisory|1[:\s-]?on[:\s-]?1|bespoke|custom|implementation|audit|done.?for.?you|managed)' THEN
    RETURN 'high_touch'::sales_complexity;
  END IF;
  RETURN NULL;
END;
$$;

-- Canonical Bet → Money Path commit boundary.
-- Idempotent by venture_id. auth.uid()-scoped ownership check.
-- Stamps offer_locked_at. Never accepts a client-supplied user_id.
CREATE OR REPLACE FUNCTION public.commit_money_path(
  p_venture_id        uuid,
  p_business_pattern  business_pattern,
  p_offer_title       text,
  p_offer_description text,
  p_buyer_segment     text,
  p_price_cents       integer DEFAULT NULL,
  p_delivery_format   text    DEFAULT NULL
) RETURNS public.money_paths
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_complexity sales_complexity;
  v_row public.money_paths;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT user_id INTO v_owner FROM public.ventures WHERE id = p_venture_id;
  IF v_owner IS NULL OR v_owner <> v_user THEN
    RAISE EXCEPTION 'venture not found' USING ERRCODE = '42704';
  END IF;

  v_complexity := public.derive_sales_complexity(p_business_pattern, p_delivery_format);

  INSERT INTO public.money_paths (
    user_id, venture_id, business_pattern,
    offer_title, offer_description, buyer_segment,
    price_cents, delivery_format, sales_complexity,
    offer_locked_at
  )
  VALUES (
    v_user, p_venture_id, p_business_pattern,
    NULLIF(p_offer_title,''), NULLIF(p_offer_description,''), NULLIF(p_buyer_segment,''),
    p_price_cents, NULLIF(p_delivery_format,''), v_complexity,
    now()
  )
  ON CONFLICT (venture_id) DO UPDATE
    SET business_pattern  = EXCLUDED.business_pattern,
        offer_title       = COALESCE(EXCLUDED.offer_title,       public.money_paths.offer_title),
        offer_description = COALESCE(EXCLUDED.offer_description, public.money_paths.offer_description),
        buyer_segment     = COALESCE(EXCLUDED.buyer_segment,     public.money_paths.buyer_segment),
        price_cents       = COALESCE(EXCLUDED.price_cents,       public.money_paths.price_cents),
        delivery_format   = COALESCE(EXCLUDED.delivery_format,   public.money_paths.delivery_format),
        sales_complexity  = COALESCE(EXCLUDED.sales_complexity,  public.money_paths.sales_complexity),
        offer_locked_at   = COALESCE(public.money_paths.offer_locked_at, EXCLUDED.offer_locked_at)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.commit_money_path(uuid, business_pattern, text, text, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_money_path(uuid, business_pattern, text, text, text, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.derive_sales_complexity(business_pattern, text) TO authenticated, service_role;
