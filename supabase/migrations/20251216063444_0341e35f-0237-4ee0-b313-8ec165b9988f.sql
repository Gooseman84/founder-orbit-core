-- Add fit_scores jsonb column to ideas table
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS fit_scores jsonb;

-- Add comment describing the structure
COMMENT ON COLUMN public.ideas.fit_scores IS 'Stores computed fit scores: { overall, passion, skill, constraints, lifestyle } each 0-100';