-- Fix commitment window constraint to allow free-tier 7-day commitments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ventures_commitment_window_days_check'
  ) THEN
    ALTER TABLE public.ventures
      DROP CONSTRAINT ventures_commitment_window_days_check;
  END IF;
END $$;

ALTER TABLE public.ventures
  ADD CONSTRAINT ventures_commitment_window_days_check
  CHECK (
    commitment_window_days IS NULL
    OR commitment_window_days IN (7, 14, 30, 90)
  );