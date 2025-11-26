-- Create opportunity_scores table
CREATE TABLE public.opportunity_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  idea_id UUID NOT NULL,
  total_score INTEGER,
  sub_scores JSONB,
  explanation TEXT,
  recommendations JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_opportunity_scores_user_id ON public.opportunity_scores(user_id);
CREATE INDEX idx_opportunity_scores_idea_id ON public.opportunity_scores(idea_id);

-- Enable Row Level Security
ALTER TABLE public.opportunity_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own opportunity scores
CREATE POLICY "Users can view their own opportunity scores"
ON public.opportunity_scores
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own opportunity scores
CREATE POLICY "Users can insert their own opportunity scores"
ON public.opportunity_scores
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Service role can bypass all restrictions
CREATE POLICY "Service role can manage all opportunity scores"
ON public.opportunity_scores
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);