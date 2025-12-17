-- Create enum for idea source types
CREATE TYPE public.idea_source_type AS ENUM ('generated', 'market_signal', 'imported', 'fused');

-- Create market_signal_domains table
CREATE TABLE public.market_signal_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('core', 'high', 'medium')),
  subreddits TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create market_signal_runs table
CREATE TABLE public.market_signal_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  selected_domains TEXT[] NOT NULL,
  selected_subreddits TEXT[] NOT NULL,
  founder_profile_snapshot JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add new columns to ideas table
ALTER TABLE public.ideas 
  ADD COLUMN source_type public.idea_source_type NOT NULL DEFAULT 'generated',
  ADD COLUMN source_meta JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN normalized JSONB NULL,
  ADD COLUMN parent_idea_ids UUID[] NULL;

-- Enable RLS on new tables
ALTER TABLE public.market_signal_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_signal_runs ENABLE ROW LEVEL SECURITY;

-- RLS for market_signal_domains: read-only for authenticated users
CREATE POLICY "Authenticated users can view market signal domains"
ON public.market_signal_domains
FOR SELECT
TO authenticated
USING (true);

-- RLS for market_signal_runs: users can insert/select their own
CREATE POLICY "Users can view their own market signal runs"
ON public.market_signal_runs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own market signal runs"
ON public.market_signal_runs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Seed market_signal_domains with v1 domains
INSERT INTO public.market_signal_domains (domain, priority, subreddits) VALUES
  ('Founders', 'core', ARRAY['startups', 'Entrepreneur', 'SideProject', 'indiehackers', 'microsaas']),
  ('SMB', 'core', ARRAY['smallbusiness', 'sweatystartup', 'ecommerce', 'dropship']),
  ('Freelancers', 'core', ARRAY['freelance', 'digitalnomad', 'WorkOnline', 'remotework']),
  ('Finance', 'high', ARRAY['personalfinance', 'financialindependence', 'fatFIRE', 'investing']),
  ('Burnout', 'high', ARRAY['burnout', 'antiwork', 'productivity', 'getdisciplined']),
  ('Parents', 'medium', ARRAY['Parenting', 'Mommit', 'daddit', 'workingmoms']),
  ('Fitness', 'medium', ARRAY['Fitness', 'loseit', 'bodyweightfitness', 'homegym']),
  ('Career', 'high', ARRAY['careerguidance', 'cscareerquestions', 'jobs', 'recruitinghell']);