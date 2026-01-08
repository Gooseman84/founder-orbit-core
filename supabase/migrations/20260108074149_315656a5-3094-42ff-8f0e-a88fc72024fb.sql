-- Create onboarding analytics table for tracking funnel completion rates
CREATE TABLE public.onboarding_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'structured_started', 'structured_completed', 'interview_started', 'interview_completed', 'interview_skipped'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_onboarding_analytics_user_id ON public.onboarding_analytics(user_id);
CREATE INDEX idx_onboarding_analytics_event_type ON public.onboarding_analytics(event_type);

-- Enable RLS
ALTER TABLE public.onboarding_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own analytics
CREATE POLICY "Users can insert their own analytics"
  ON public.onboarding_analytics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own analytics (for debugging)
CREATE POLICY "Users can view their own analytics"
  ON public.onboarding_analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);