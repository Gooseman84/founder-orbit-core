-- Create master_prompts table
CREATE TABLE public.master_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  idea_id UUID NOT NULL,
  prompt_body TEXT NOT NULL,
  platform_target TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_master_prompts_user_id ON public.master_prompts(user_id);
CREATE INDEX idx_master_prompts_idea_id ON public.master_prompts(idea_id);

-- Enable Row Level Security
ALTER TABLE public.master_prompts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own master prompts"
ON public.master_prompts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own master prompts"
ON public.master_prompts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own master prompts"
ON public.master_prompts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own master prompts"
ON public.master_prompts
FOR DELETE
USING (auth.uid() = user_id);