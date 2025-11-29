-- Create daily_reflections table (unified daily check-in + pulse)
CREATE TABLE public.daily_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reflection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Numeric/mood inputs (from pulse)
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5),
  mood_tags TEXT[] DEFAULT '{}',
  
  -- Reflection questions (from check-ins + expanded)
  what_did TEXT,
  what_learned TEXT,
  what_felt TEXT,
  top_priority TEXT,
  blockers TEXT,
  
  -- AI-generated outputs
  ai_summary TEXT,
  ai_theme TEXT,
  ai_micro_actions JSONB DEFAULT '[]',
  ai_suggested_task JSONB,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- One record per user per day
  CONSTRAINT unique_user_daily_reflection UNIQUE (user_id, reflection_date)
);

-- Enable RLS
ALTER TABLE public.daily_reflections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own reflections"
ON public.daily_reflections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reflections"
ON public.daily_reflections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reflections"
ON public.daily_reflections
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reflections"
ON public.daily_reflections
FOR DELETE
USING (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX idx_daily_reflections_user_date ON public.daily_reflections(user_id, reflection_date DESC);

-- Trigger for updated_at
CREATE TRIGGER update_daily_reflections_updated_at
BEFORE UPDATE ON public.daily_reflections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();