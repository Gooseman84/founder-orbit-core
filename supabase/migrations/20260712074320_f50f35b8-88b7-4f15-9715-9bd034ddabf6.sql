
-- =========================================================================
-- BLOCK 1: MONEY PATH FOUNDATION (additive, non-destructive)
-- =========================================================================

-- 1. ENUMS ----------------------------------------------------------------

CREATE TYPE public.business_pattern AS ENUM (
  'productized_service',
  'advisory',
  'cohort',
  'digital_product',
  'licensing',
  'micro_saas'
);

CREATE TYPE public.money_path_stage AS ENUM (
  'S1_OFFER_SHAPING',
  'S2_OUTREACH',
  'S3_CONVERSATIONS',
  'S4_OFFERS_OUT',
  'S5_FIRST_REVENUE',
  'S6_REPEATABLE',
  'S7_SCALE'
);

CREATE TYPE public.bottleneck_kind AS ENUM (
  'B_NO_OFFER',
  'B_NO_BUYER_LIST',
  'B_NO_OUTREACH',
  'B_NO_REPLIES',
  'B_REPLIES_NO_CALLS',
  'B_CALLS_NO_OFFERS',
  'B_OFFERS_NO_CLOSE',
  'B_PRICE_OBJECTION',
  'B_CHANNEL_EXHAUSTED',
  'B_DELIVERY_STUCK'
);

CREATE TYPE public.conversation_status AS ENUM (
  'identified',
  'contacted',
  'replied',
  'call_booked',
  'offer_sent',
  'won',
  'lost',
  'ghosted'
);

CREATE TYPE public.signal_kind AS ENUM (
  'polishing',
  'ghosting',
  'scope_creep',
  'cheap_signal_loop',
  'silent_stall'
);

CREATE TYPE public.warm_network_strength AS ENUM (
  'none',
  'weak',
  'moderate',
  'strong'
);

CREATE TYPE public.nba_outcome AS ENUM (
  'pending',
  'done',
  'skipped',
  'overridden',
  'expired'
);

CREATE TYPE public.sales_complexity AS ENUM (
  'self_serve',
  'light_touch',
  'high_touch'
);

-- 2. SHARED updated_at TRIGGER FUNCTION -----------------------------------
-- (Reuses existing public.update_updated_at_column())

-- =========================================================================
-- 3. TABLES  (order: CREATE → GRANT → RLS ENABLE → POLICIES)
-- =========================================================================

-- 3a. money_paths ---------------------------------------------------------
-- NOTE: Deliberately NO `stage` column. Stage is derived by v_money_path_stage.
CREATE TABLE public.money_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  venture_id uuid NOT NULL,
  business_pattern public.business_pattern NOT NULL DEFAULT 'productized_service',
  offer_title text,
  offer_description text,
  buyer_segment text,
  price_cents integer,
  delivery_format text,
  sales_complexity public.sales_complexity,
  target_customers_for_first_10k integer,
  current_revenue_cents integer NOT NULL DEFAULT 0,
  offer_locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venture_id)
);
CREATE INDEX idx_money_paths_user ON public.money_paths(user_id);
CREATE INDEX idx_money_paths_venture ON public.money_paths(venture_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.money_paths TO authenticated;
GRANT ALL ON public.money_paths TO service_role;
ALTER TABLE public.money_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "money_paths_owner_select" ON public.money_paths
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "money_paths_owner_insert" ON public.money_paths
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "money_paths_owner_update" ON public.money_paths
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "money_paths_owner_delete" ON public.money_paths
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_money_paths_updated_at
  BEFORE UPDATE ON public.money_paths
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3b. founder_advantages --------------------------------------------------
CREATE TABLE public.founder_advantages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  warm_network_strength public.warm_network_strength NOT NULL DEFAULT 'none',
  existing_audience_size integer NOT NULL DEFAULT 0,
  existing_audience_channel text,
  platform_strengths text[] NOT NULL DEFAULT '{}',
  domain_authority_signals text[] NOT NULL DEFAULT '{}',
  existing_client_access boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_advantages TO authenticated;
GRANT ALL ON public.founder_advantages TO service_role;
ALTER TABLE public.founder_advantages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_advantages_owner_select" ON public.founder_advantages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "founder_advantages_owner_insert" ON public.founder_advantages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "founder_advantages_owner_update" ON public.founder_advantages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "founder_advantages_owner_delete" ON public.founder_advantages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_founder_advantages_updated_at
  BEFORE UPDATE ON public.founder_advantages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3c. revenue_events ------------------------------------------------------
-- (created BEFORE buyer_conversations because conversations references it)
CREATE TABLE public.revenue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  money_path_id uuid NOT NULL REFERENCES public.money_paths(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  source_channel text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_revenue_events_money_path ON public.revenue_events(money_path_id);
CREATE INDEX idx_revenue_events_user ON public.revenue_events(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_events TO authenticated;
GRANT ALL ON public.revenue_events TO service_role;
ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revenue_events_owner_select" ON public.revenue_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "revenue_events_owner_insert" ON public.revenue_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "revenue_events_owner_update" ON public.revenue_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "revenue_events_owner_delete" ON public.revenue_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_revenue_events_updated_at
  BEFORE UPDATE ON public.revenue_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3d. buyer_conversations -------------------------------------------------
CREATE TABLE public.buyer_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  money_path_id uuid NOT NULL REFERENCES public.money_paths(id) ON DELETE CASCADE,
  handle text NOT NULL,
  channel text,
  status public.conversation_status NOT NULL DEFAULT 'identified',
  notes text,
  outcome text,
  revenue_event_id uuid REFERENCES public.revenue_events(id) ON DELETE SET NULL,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_buyer_conv_money_path ON public.buyer_conversations(money_path_id);
CREATE INDEX idx_buyer_conv_user ON public.buyer_conversations(user_id);
CREATE INDEX idx_buyer_conv_status ON public.buyer_conversations(money_path_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_conversations TO authenticated;
GRANT ALL ON public.buyer_conversations TO service_role;
ALTER TABLE public.buyer_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_conv_owner_select" ON public.buyer_conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "buyer_conv_owner_insert" ON public.buyer_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "buyer_conv_owner_update" ON public.buyer_conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "buyer_conv_owner_delete" ON public.buyer_conversations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_buyer_conv_updated_at
  BEFORE UPDATE ON public.buyer_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3e. action_templates ----------------------------------------------------
-- Pure content library. NO selection rules here — those live in application code.
CREATE TABLE public.action_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  business_pattern public.business_pattern NOT NULL,
  applicable_stages public.money_path_stage[] NOT NULL,
  addresses_bottleneck public.bottleneck_kind NOT NULL,
  title text NOT NULL,
  why_now_template text NOT NULL,
  done_looks_like text NOT NULL,
  deliverable_kind text NOT NULL,
  deliverable_prompt text NOT NULL,
  estimated_minutes integer NOT NULL DEFAULT 30,
  cooldown_days integer NOT NULL DEFAULT 3,
  incompatible_with text[] NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_action_templates_lookup
  ON public.action_templates(business_pattern, addresses_bottleneck)
  WHERE active = true;

-- Templates are curated library content — readable by any authenticated user.
GRANT SELECT ON public.action_templates TO authenticated;
GRANT ALL ON public.action_templates TO service_role;
ALTER TABLE public.action_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "action_templates_read_all_authed" ON public.action_templates
  FOR SELECT TO authenticated USING (active = true);

CREATE TRIGGER trg_action_templates_updated_at
  BEFORE UPDATE ON public.action_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3f. nba_history ---------------------------------------------------------
CREATE TABLE public.nba_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  money_path_id uuid NOT NULL REFERENCES public.money_paths(id) ON DELETE CASCADE,
  template_code text NOT NULL,
  stage_at_serve public.money_path_stage NOT NULL,
  bottleneck_at_serve public.bottleneck_kind NOT NULL,
  deliverable_snapshot jsonb,
  served_at timestamptz NOT NULL DEFAULT now(),
  outcome public.nba_outcome NOT NULL DEFAULT 'pending',
  outcome_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_nba_history_money_path ON public.nba_history(money_path_id, served_at DESC);
CREATE INDEX idx_nba_history_user ON public.nba_history(user_id, served_at DESC);
CREATE INDEX idx_nba_history_cooldown ON public.nba_history(money_path_id, template_code, served_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nba_history TO authenticated;
GRANT ALL ON public.nba_history TO service_role;
ALTER TABLE public.nba_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nba_history_owner_select" ON public.nba_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "nba_history_owner_insert" ON public.nba_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nba_history_owner_update" ON public.nba_history
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_nba_history_updated_at
  BEFORE UPDATE ON public.nba_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3g. founder_signals -----------------------------------------------------
CREATE TABLE public.founder_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  money_path_id uuid NOT NULL REFERENCES public.money_paths(id) ON DELETE CASCADE,
  kind public.signal_kind NOT NULL,
  severity integer NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  context jsonb,
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_founder_signals_money_path ON public.founder_signals(money_path_id, opened_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_signals TO authenticated;
GRANT ALL ON public.founder_signals TO service_role;
ALTER TABLE public.founder_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_signals_owner_select" ON public.founder_signals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "founder_signals_owner_update" ON public.founder_signals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_founder_signals_updated_at
  BEFORE UPDATE ON public.founder_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3h. founder_overrides ---------------------------------------------------
CREATE TABLE public.founder_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nba_history_id uuid NOT NULL REFERENCES public.nba_history(id) ON DELETE CASCADE,
  chosen_alternative text NOT NULL,
  reason text,
  direction text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_founder_overrides_user ON public.founder_overrides(user_id);

GRANT SELECT, INSERT ON public.founder_overrides TO authenticated;
GRANT ALL ON public.founder_overrides TO service_role;
ALTER TABLE public.founder_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_overrides_owner_select" ON public.founder_overrides
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "founder_overrides_owner_insert" ON public.founder_overrides
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- 4. DERIVED VIEWS  (sole source of truth for stage & bottleneck)
-- =========================================================================

-- v_money_path_stage: stage from evidence
CREATE OR REPLACE VIEW public.v_money_path_stage
WITH (security_invoker = true) AS
WITH agg AS (
  SELECT
    mp.id AS money_path_id,
    mp.user_id,
    mp.offer_locked_at,
    COALESCE(SUM(re.amount_cents), 0) AS revenue_cents,
    COUNT(re.id) AS revenue_count,
    COUNT(bc.id) FILTER (WHERE bc.status IN ('contacted','replied','call_booked','offer_sent','won','lost','ghosted')) AS contacted_count,
    COUNT(bc.id) FILTER (WHERE bc.status IN ('replied','call_booked','offer_sent','won','lost')) AS replied_count,
    COUNT(bc.id) FILTER (WHERE bc.status = 'offer_sent' OR bc.status = 'won' OR bc.status = 'lost') AS offer_sent_count
  FROM public.money_paths mp
  LEFT JOIN public.buyer_conversations bc ON bc.money_path_id = mp.id
  LEFT JOIN public.revenue_events re ON re.money_path_id = mp.id
  GROUP BY mp.id, mp.user_id, mp.offer_locked_at
)
SELECT
  money_path_id,
  user_id,
  CASE
    WHEN revenue_cents >= 1000000 THEN 'S7_SCALE'::public.money_path_stage
    WHEN revenue_count >= 3 THEN 'S6_REPEATABLE'::public.money_path_stage
    WHEN revenue_count >= 1 THEN 'S5_FIRST_REVENUE'::public.money_path_stage
    WHEN offer_sent_count >= 1 THEN 'S4_OFFERS_OUT'::public.money_path_stage
    WHEN replied_count >= 1 THEN 'S3_CONVERSATIONS'::public.money_path_stage
    WHEN offer_locked_at IS NOT NULL THEN 'S2_OUTREACH'::public.money_path_stage
    ELSE 'S1_OFFER_SHAPING'::public.money_path_stage
  END AS stage,
  revenue_cents,
  revenue_count,
  contacted_count,
  replied_count,
  offer_sent_count
FROM agg;

GRANT SELECT ON public.v_money_path_stage TO authenticated, service_role;

-- v_active_bottleneck: bottleneck from evidence
CREATE OR REPLACE VIEW public.v_active_bottleneck
WITH (security_invoker = true) AS
WITH agg AS (
  SELECT
    mp.id AS money_path_id,
    mp.user_id,
    mp.offer_locked_at,
    mp.buyer_segment,
    COUNT(bc.id) AS total_conv,
    COUNT(bc.id) FILTER (WHERE bc.status = 'identified') AS identified_count,
    COUNT(bc.id) FILTER (WHERE bc.status IN ('contacted','replied','call_booked','offer_sent','won','lost','ghosted')) AS contacted_count,
    COUNT(bc.id) FILTER (WHERE bc.status IN ('replied','call_booked','offer_sent','won','lost')) AS replied_count,
    COUNT(bc.id) FILTER (WHERE bc.status IN ('call_booked','offer_sent','won','lost')) AS call_booked_count,
    COUNT(bc.id) FILTER (WHERE bc.status IN ('offer_sent','won','lost')) AS offer_sent_count,
    COUNT(bc.id) FILTER (WHERE bc.status = 'won') AS won_count,
    COUNT(bc.id) FILTER (WHERE bc.status = 'lost') AS lost_count
  FROM public.money_paths mp
  LEFT JOIN public.buyer_conversations bc ON bc.money_path_id = mp.id
  GROUP BY mp.id, mp.user_id, mp.offer_locked_at, mp.buyer_segment
)
SELECT
  money_path_id,
  user_id,
  CASE
    WHEN offer_locked_at IS NULL THEN 'B_NO_OFFER'::public.bottleneck_kind
    WHEN total_conv = 0 THEN 'B_NO_BUYER_LIST'::public.bottleneck_kind
    WHEN contacted_count = 0 THEN 'B_NO_OUTREACH'::public.bottleneck_kind
    WHEN replied_count = 0 THEN 'B_NO_REPLIES'::public.bottleneck_kind
    WHEN call_booked_count = 0 THEN 'B_REPLIES_NO_CALLS'::public.bottleneck_kind
    WHEN offer_sent_count = 0 THEN 'B_CALLS_NO_OFFERS'::public.bottleneck_kind
    WHEN won_count = 0 THEN 'B_OFFERS_NO_CLOSE'::public.bottleneck_kind
    ELSE 'B_OFFERS_NO_CLOSE'::public.bottleneck_kind
  END AS bottleneck
FROM agg;

GRANT SELECT ON public.v_active_bottleneck TO authenticated, service_role;

-- =========================================================================
-- 5. ensure_money_path(venture_id)
-- Idempotent. Derives user from auth.uid(). Verifies venture ownership.
-- Impossible to create/inspect a Money Path for someone else's venture.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.ensure_money_path(p_venture_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_mp_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  -- Verify the caller owns the source venture. If not owned (or missing),
  -- behave identically to "not found" — do NOT leak existence.
  SELECT user_id INTO v_owner FROM public.ventures WHERE id = p_venture_id;
  IF v_owner IS NULL OR v_owner <> v_user THEN
    RAISE EXCEPTION 'venture not found' USING ERRCODE = '42704';
  END IF;

  -- Idempotent: if a money path already exists for this venture, return it.
  SELECT id INTO v_mp_id
  FROM public.money_paths
  WHERE venture_id = p_venture_id AND user_id = v_user;

  IF v_mp_id IS NOT NULL THEN
    RETURN v_mp_id;
  END IF;

  INSERT INTO public.money_paths (user_id, venture_id, business_pattern)
  VALUES (v_user, p_venture_id, 'productized_service')
  RETURNING id INTO v_mp_id;

  RETURN v_mp_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_money_path(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_money_path(uuid) TO authenticated;
