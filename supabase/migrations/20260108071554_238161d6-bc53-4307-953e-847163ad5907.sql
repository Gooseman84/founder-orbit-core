ALTER TABLE public.founder_profiles 
ADD COLUMN IF NOT EXISTS entry_trigger TEXT,
ADD COLUMN IF NOT EXISTS future_vision TEXT,
ADD COLUMN IF NOT EXISTS desired_identity TEXT,
ADD COLUMN IF NOT EXISTS business_type_preference TEXT,
ADD COLUMN IF NOT EXISTS energy_source TEXT,
ADD COLUMN IF NOT EXISTS learning_style TEXT,
ADD COLUMN IF NOT EXISTS commitment_level_text TEXT,
ADD COLUMN IF NOT EXISTS context_summary JSONB,
ADD COLUMN IF NOT EXISTS structured_onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS interview_completed_at TIMESTAMPTZ;