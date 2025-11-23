-- Create founder_profiles table
CREATE TABLE public.founder_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  passions_text TEXT,
  passions_tags TEXT[],
  skills_text TEXT,
  skills_tags TEXT[],
  tech_level TEXT,
  time_per_week INTEGER,
  capital_available INTEGER,
  risk_tolerance TEXT,
  lifestyle_goals TEXT,
  success_vision TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create ideas table
CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  business_model_type TEXT,
  target_customer TEXT,
  time_to_first_dollar TEXT,
  complexity TEXT,
  passion_fit_score INTEGER,
  skill_fit_score INTEGER,
  constraint_fit_score INTEGER,
  lifestyle_fit_score INTEGER,
  overall_fit_score INTEGER,
  status TEXT DEFAULT 'candidate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create idea_analysis table
CREATE TABLE public.idea_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  niche_score INTEGER,
  market_overview TEXT,
  problem_intensity TEXT,
  competition_snapshot TEXT,
  pricing_range TEXT,
  main_risks JSONB,
  brutal_take TEXT,
  suggested_modifications TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(idea_id)
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_id UUID REFERENCES public.ideas(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  estimated_minutes INTEGER,
  xp_reward INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create xp_events table
CREATE TABLE public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_founder_profiles_user_id ON public.founder_profiles(user_id);
CREATE INDEX idx_ideas_user_id ON public.ideas(user_id);
CREATE INDEX idx_ideas_status ON public.ideas(status);
CREATE INDEX idx_idea_analysis_user_id ON public.idea_analysis(user_id);
CREATE INDEX idx_idea_analysis_idea_id ON public.idea_analysis(idea_id);
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_idea_id ON public.tasks(idea_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_xp_events_user_id ON public.xp_events(user_id);
CREATE INDEX idx_xp_events_created_at ON public.xp_events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.founder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for founder_profiles
CREATE POLICY "Users can view their own profile"
  ON public.founder_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.founder_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.founder_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
  ON public.founder_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for ideas
CREATE POLICY "Users can view their own ideas"
  ON public.ideas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ideas"
  ON public.ideas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ideas"
  ON public.ideas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ideas"
  ON public.ideas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for idea_analysis
CREATE POLICY "Users can view their own idea analysis"
  ON public.idea_analysis FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own idea analysis"
  ON public.idea_analysis FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own idea analysis"
  ON public.idea_analysis FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own idea analysis"
  ON public.idea_analysis FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for tasks
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for xp_events
CREATE POLICY "Users can view their own xp events"
  ON public.xp_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own xp events"
  ON public.xp_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Helper function to calculate total XP for a user
CREATE OR REPLACE FUNCTION public.get_user_total_xp(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM public.xp_events
  WHERE user_id = p_user_id;
$$;