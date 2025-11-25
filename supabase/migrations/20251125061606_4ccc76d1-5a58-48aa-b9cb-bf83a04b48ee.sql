-- Ensure xp_events table has proper index and RLS policies for XP system

-- Add index on user_id for faster queries (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_xp_events_user_id ON public.xp_events(user_id);

-- Drop the existing INSERT policy that allows users to create their own XP events
-- This ensures only service role (edge functions) can insert XP events
DROP POLICY IF EXISTS "Users can create their own xp events" ON public.xp_events;

-- The SELECT policy already exists and is correct:
-- "Users can view their own xp events" with (auth.uid() = user_id)
-- This allows authenticated users to read only their own XP events