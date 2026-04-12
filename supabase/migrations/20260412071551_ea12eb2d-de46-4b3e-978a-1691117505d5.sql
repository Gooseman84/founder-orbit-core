-- Create execution_strategies table for the feedback loop
CREATE TABLE public.execution_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  venture_id UUID NOT NULL REFERENCES public.ventures(id) ON DELETE CASCADE,
  strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  behavioral_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(venture_id)
);

-- Enable RLS
ALTER TABLE public.execution_strategies ENABLE ROW LEVEL SECURITY;

-- Users can only see their own strategies
CREATE POLICY "Users can view own execution strategies"
  ON public.execution_strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own execution strategies"
  ON public.execution_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own execution strategies"
  ON public.execution_strategies FOR UPDATE
  USING (auth.uid() = user_id);

-- Create market_validations table (referenced by adapt-execution-strategy)
CREATE TABLE IF NOT EXISTS public.market_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  validation_score INTEGER NOT NULL DEFAULT 0,
  demand_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  competitor_landscape JSONB NOT NULL DEFAULT '[]'::jsonb,
  market_timing TEXT DEFAULT 'unknown',
  raw_response JSONB,
  validated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.market_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own market validations"
  ON public.market_validations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own market validations"
  ON public.market_validations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_execution_strategies_venture ON public.execution_strategies(venture_id);
CREATE INDEX idx_market_validations_idea ON public.market_validations(idea_id);
