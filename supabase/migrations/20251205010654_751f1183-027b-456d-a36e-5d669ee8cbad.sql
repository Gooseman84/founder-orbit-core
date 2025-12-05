-- Add JSONB profile and mirroring columns to founder_profiles
ALTER TABLE public.founder_profiles
  ADD COLUMN IF NOT EXISTS profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS hours_per_week integer,
  ADD COLUMN IF NOT EXISTS commitment_level integer,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_founder_profiles_user_id ON public.founder_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_founder_profiles_risk_tolerance ON public.founder_profiles (risk_tolerance);
CREATE INDEX IF NOT EXISTS idx_founder_profiles_commitment_level ON public.founder_profiles (commitment_level);

-- Trigger to maintain updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_founder_profiles_updated_at'
  ) THEN
    CREATE TRIGGER set_founder_profiles_updated_at
    BEFORE UPDATE ON public.founder_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;