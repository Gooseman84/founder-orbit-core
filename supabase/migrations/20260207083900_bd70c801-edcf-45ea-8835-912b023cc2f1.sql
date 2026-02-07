-- Create financial_viability_scores table
CREATE TABLE public.financial_viability_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  composite_score INTEGER NOT NULL,
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  top_risk TEXT,
  top_opportunity TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_viability_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own financial viability scores"
  ON public.financial_viability_scores
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial viability scores"
  ON public.financial_viability_scores
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial viability scores"
  ON public.financial_viability_scores
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_financial_viability_scores_idea ON public.financial_viability_scores(idea_id);
CREATE INDEX idx_financial_viability_scores_user ON public.financial_viability_scores(user_id);