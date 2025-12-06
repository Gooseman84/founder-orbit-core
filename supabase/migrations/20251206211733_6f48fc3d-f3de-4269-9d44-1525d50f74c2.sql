-- Create table for founder-generated ideas
CREATE TABLE public.founder_generated_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  idea_id text NOT NULL,
  idea jsonb NOT NULL,
  source text NOT NULL DEFAULT 'trueblazer_ideation_engine',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_founder_generated_ideas_user_id ON public.founder_generated_ideas (user_id);
CREATE INDEX idx_founder_generated_ideas_idea_id ON public.founder_generated_ideas (idea_id);

-- Enable RLS
ALTER TABLE public.founder_generated_ideas ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own saved ideas"
ON public.founder_generated_ideas
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ideas"
ON public.founder_generated_ideas
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ideas"
ON public.founder_generated_ideas
FOR DELETE
USING (auth.uid() = user_id);