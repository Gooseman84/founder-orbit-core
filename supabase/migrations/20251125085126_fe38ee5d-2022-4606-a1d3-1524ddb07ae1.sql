-- Create niche_radar table
CREATE TABLE IF NOT EXISTS public.niche_radar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  idea_id UUID,
  signal_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority_score INTEGER,
  recommended_action TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_niche_radar_user_id ON public.niche_radar(user_id);

-- Enable Row Level Security
ALTER TABLE public.niche_radar ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own radar signals
CREATE POLICY "Users can view their own radar signals"
ON public.niche_radar
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own radar signals
CREATE POLICY "Users can insert their own radar signals"
ON public.niche_radar
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own radar signals
CREATE POLICY "Users can update their own radar signals"
ON public.niche_radar
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own radar signals
CREATE POLICY "Users can delete their own radar signals"
ON public.niche_radar
FOR DELETE
USING (auth.uid() = user_id);