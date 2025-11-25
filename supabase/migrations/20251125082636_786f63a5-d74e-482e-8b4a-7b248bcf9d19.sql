-- Create pulse_checks table
CREATE TABLE IF NOT EXISTS public.pulse_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  energy_level INTEGER,
  stress_level INTEGER,
  emotional_state TEXT,
  reflection TEXT,
  ai_insight TEXT,
  recommended_action TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_pulse_checks_user_id ON public.pulse_checks(user_id);

-- Enable Row Level Security
ALTER TABLE public.pulse_checks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own pulse checks
CREATE POLICY "Users can view their own pulse checks"
  ON public.pulse_checks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own pulse checks
CREATE POLICY "Users can create their own pulse checks"
  ON public.pulse_checks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);