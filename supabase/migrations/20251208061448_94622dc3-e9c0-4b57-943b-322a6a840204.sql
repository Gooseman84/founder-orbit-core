-- Create ventures table
CREATE TABLE public.ventures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  idea_id uuid REFERENCES public.ideas(id) ON DELETE SET NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for ventures
CREATE INDEX ventures_user_id_idx ON public.ventures (user_id);
CREATE INDEX ventures_user_id_status_idx ON public.ventures (user_id, status);
CREATE INDEX ventures_idea_id_idx ON public.ventures (idea_id);

-- Enable RLS for ventures
ALTER TABLE public.ventures ENABLE ROW LEVEL SECURITY;

-- RLS policies for ventures
CREATE POLICY "Users can view their own ventures"
  ON public.ventures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ventures"
  ON public.ventures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ventures"
  ON public.ventures FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ventures"
  ON public.ventures FOR DELETE
  USING (auth.uid() = user_id);

-- Create venture_plans table
CREATE TABLE public.venture_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  venture_id uuid NOT NULL REFERENCES public.ventures(id) ON DELETE CASCADE,
  plan_type text NOT NULL DEFAULT '30_day',
  start_date date NOT NULL,
  end_date date NOT NULL,
  summary text,
  ai_raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for venture_plans
CREATE INDEX venture_plans_user_venture_idx ON public.venture_plans (user_id, venture_id, created_at DESC);

-- Enable RLS for venture_plans
ALTER TABLE public.venture_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for venture_plans
CREATE POLICY "Users can view their own venture plans"
  ON public.venture_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own venture plans"
  ON public.venture_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own venture plans"
  ON public.venture_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own venture plans"
  ON public.venture_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Add venture_id to tasks table (nullable, no breaking changes)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS venture_id uuid REFERENCES public.ventures(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_venture_id_idx ON public.tasks (venture_id);

-- Add week_number and source to tasks table for 30-day plan tracking
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS week_number integer,
  ADD COLUMN IF NOT EXISTS source text;

-- Add venture_id to workspace_documents table (nullable, no breaking changes)
ALTER TABLE public.workspace_documents
  ADD COLUMN IF NOT EXISTS venture_id uuid REFERENCES public.ventures(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS workspace_documents_venture_id_idx ON public.workspace_documents (venture_id);

-- Add trigger for updated_at on ventures
CREATE TRIGGER update_ventures_updated_at
  BEFORE UPDATE ON public.ventures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on venture_plans
CREATE TRIGGER update_venture_plans_updated_at
  BEFORE UPDATE ON public.venture_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();