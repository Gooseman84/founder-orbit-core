
ALTER TYPE public.bottleneck_kind ADD VALUE IF NOT EXISTS 'B_NOT_YET_REPEATABLE';
ALTER TYPE public.bottleneck_kind ADD VALUE IF NOT EXISTS 'B_LOSS_REASON_UNKNOWN';
ALTER TYPE public.signal_kind    ADD VALUE IF NOT EXISTS 'SIG_AVOIDS_ASK';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loss_reason') THEN
    CREATE TYPE public.loss_reason AS ENUM (
      'price','roi_unclear','timing','trust','poor_fit','competitor','unknown'
    );
  END IF;
END $$;

ALTER TABLE public.founder_advantages
  ADD COLUMN IF NOT EXISTS reachable_buyer_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activatable_audience  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_prior_paid_proof  boolean NOT NULL DEFAULT false;

ALTER TABLE public.buyer_conversations
  ADD COLUMN IF NOT EXISTS loss_reason      public.loss_reason,
  ADD COLUMN IF NOT EXISTS loss_note        text,
  ADD COLUMN IF NOT EXISTS loss_recorded_at timestamptz;

CREATE OR REPLACE FUNCTION public.validate_buyer_conversation_loss()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  IF NEW.loss_reason IS NOT NULL AND NEW.status <> 'lost' THEN
    RAISE EXCEPTION 'loss_reason only valid when status = lost';
  END IF;
  IF NEW.loss_reason IS NOT NULL AND NEW.loss_recorded_at IS NULL THEN
    NEW.loss_recorded_at := now();
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_validate_loss_reason ON public.buyer_conversations;
CREATE TRIGGER trg_validate_loss_reason
  BEFORE INSERT OR UPDATE ON public.buyer_conversations
  FOR EACH ROW EXECUTE FUNCTION public.validate_buyer_conversation_loss();
