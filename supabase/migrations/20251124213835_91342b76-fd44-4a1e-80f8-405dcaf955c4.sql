-- Update idea_analysis table to match new analysis structure
ALTER TABLE public.idea_analysis 
  DROP COLUMN IF EXISTS market_overview,
  DROP COLUMN IF EXISTS pricing_range,
  DROP COLUMN IF EXISTS main_risks,
  DROP COLUMN IF EXISTS brutal_take,
  DROP COLUMN IF EXISTS suggested_modifications;

ALTER TABLE public.idea_analysis
  ADD COLUMN market_insight text,
  ADD COLUMN pricing_power text,
  ADD COLUMN success_likelihood text,
  ADD COLUMN biggest_risks jsonb,
  ADD COLUMN unfair_advantages jsonb,
  ADD COLUMN recommendations jsonb,
  ADD COLUMN ideal_customer_profile text,
  ADD COLUMN elevator_pitch text,
  ADD COLUMN brutal_honesty text;