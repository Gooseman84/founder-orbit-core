-- Create feed_items table
CREATE TABLE IF NOT EXISTS public.feed_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  idea_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  cta_label text,
  cta_action text,
  xp_reward integer DEFAULT 2,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index on user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_feed_items_user_id ON public.feed_items(user_id);

-- Enable RLS
ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own feed items
CREATE POLICY "Users can view their own feed items"
ON public.feed_items
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Service role can insert feed items
CREATE POLICY "Service role can insert feed items"
ON public.feed_items
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Service role can delete feed items
CREATE POLICY "Service role can delete feed items"
ON public.feed_items
FOR DELETE
TO service_role
USING (true);