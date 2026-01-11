-- Fix permissive RLS policies (replace 'true' and remove public-role access)

-- opportunity_scores
DROP POLICY IF EXISTS "Service role can manage all opportunity scores" ON public.opportunity_scores;
CREATE POLICY "Service role can manage all opportunity scores"
ON public.opportunity_scores
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- user_subscriptions
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Service role can manage all subscriptions"
ON public.user_subscriptions
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can delete their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Service role can manage support tickets" ON public.support_tickets;

CREATE POLICY "Users can view their own tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tickets"
ON public.support_tickets
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage support tickets"
ON public.support_tickets
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');