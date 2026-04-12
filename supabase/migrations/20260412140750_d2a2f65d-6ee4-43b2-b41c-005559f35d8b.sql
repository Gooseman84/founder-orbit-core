
-- 1. Add SELECT policy on beta_feedback so users can read their own submissions
CREATE POLICY "Users can read own feedback"
ON public.beta_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Fix user_subscriptions: drop the public-role policy and recreate for authenticated only
DROP POLICY IF EXISTS "Users can read own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can read own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Restrict frameworks table to service_role only (used server-side in edge functions)
DROP POLICY IF EXISTS "Authenticated users can read frameworks" ON public.frameworks;
CREATE POLICY "Service role reads frameworks"
ON public.frameworks
FOR SELECT
TO service_role
USING (true);

-- 4. Restrict market_signal_domains to service_role only (internal config)
DROP POLICY IF EXISTS "Authenticated users can read market signal domains" ON public.market_signal_domains;
CREATE POLICY "Service role reads market signal domains"
ON public.market_signal_domains
FOR SELECT
TO service_role
USING (true);
