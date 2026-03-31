-- Fix 1: Remove user UPDATE policy on user_subscriptions (prevents self-upgrade)
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;

-- Fix 2: Restrict xp_events INSERT to service_role only (prevents XP inflation)
DROP POLICY IF EXISTS "Users can insert their own xp events" ON public.xp_events;

CREATE POLICY "Service role can insert xp events"
  ON public.xp_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);