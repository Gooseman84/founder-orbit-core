-- Add INSERT policy for xp_events table to allow users to insert their own XP events
CREATE POLICY "Users can insert their own xp events"
ON public.xp_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Ensure SELECT policy is properly configured (update if needed)
DROP POLICY IF EXISTS "Users can view their own xp events" ON public.xp_events;
CREATE POLICY "Users can view their own xp events"
ON public.xp_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);