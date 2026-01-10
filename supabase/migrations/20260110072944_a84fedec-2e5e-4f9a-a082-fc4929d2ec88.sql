-- Agent Memory Table
CREATE TABLE IF NOT EXISTS public.agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  memory_path TEXT NOT NULL,
  memory_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, memory_path)
);

CREATE INDEX idx_agent_memory_path ON public.agent_memory(user_id, memory_path);

-- Enable RLS
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_memory
CREATE POLICY "Users can view their own agent memory"
  ON public.agent_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agent memory"
  ON public.agent_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent memory"
  ON public.agent_memory FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent memory"
  ON public.agent_memory FOR DELETE
  USING (auth.uid() = user_id);

-- Agent Decisions Table
CREATE TABLE IF NOT EXISTS public.agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  inputs JSONB NOT NULL,
  outputs JSONB NOT NULL,
  reasoning TEXT,
  confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  requires_approval BOOLEAN DEFAULT false,
  approved BOOLEAN,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_decisions_user ON public.agent_decisions(user_id, created_at DESC);
CREATE INDEX idx_agent_decisions_agent ON public.agent_decisions(agent_name, created_at DESC);

-- Enable RLS
ALTER TABLE public.agent_decisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_decisions
CREATE POLICY "Users can view their own agent decisions"
  ON public.agent_decisions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agent decisions"
  ON public.agent_decisions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent decisions"
  ON public.agent_decisions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at on agent_memory
CREATE TRIGGER update_agent_memory_updated_at
  BEFORE UPDATE ON public.agent_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();