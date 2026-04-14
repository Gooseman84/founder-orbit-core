
-- Create founder_context_snapshots table
CREATE TABLE public.founder_context_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  venture_id uuid NOT NULL REFERENCES public.ventures(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  trigger_event text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast latest-snapshot lookups
CREATE INDEX idx_fcs_venture_latest ON public.founder_context_snapshots (user_id, venture_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.founder_context_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can read their own snapshots
CREATE POLICY "Users can view own snapshots"
  ON public.founder_context_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own snapshots (client-side trigger path)
CREATE POLICY "Users can insert own snapshots"
  ON public.founder_context_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role has full access (edge functions write via service client)
CREATE POLICY "Service role full access"
  ON public.founder_context_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
