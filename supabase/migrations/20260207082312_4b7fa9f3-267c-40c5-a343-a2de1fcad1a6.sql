-- Create personalized_recommendations table
CREATE TABLE public.personalized_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  interview_id UUID NOT NULL REFERENCES public.founder_interviews(id) ON DELETE CASCADE,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  generation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personalized_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see their own
CREATE POLICY "Users can view their own recommendations"
ON public.personalized_recommendations
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can create their own recommendations"
ON public.personalized_recommendations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own recommendations"
ON public.personalized_recommendations
FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_personalized_recommendations_user_id ON public.personalized_recommendations(user_id);
CREATE INDEX idx_personalized_recommendations_interview_id ON public.personalized_recommendations(interview_id);