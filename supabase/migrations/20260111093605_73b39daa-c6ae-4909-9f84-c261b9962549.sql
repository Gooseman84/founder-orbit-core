-- Tighten permissive service_role policies (avoid WITH CHECK (true))
DROP POLICY IF EXISTS "Service role can insert feed items" ON public.feed_items;
DROP POLICY IF EXISTS "Service role can delete feed items" ON public.feed_items;
DROP POLICY IF EXISTS "Service role can insert user badges" ON public.user_badges;
DROP POLICY IF EXISTS "Service role can insert user milestones" ON public.user_milestones;

CREATE POLICY "Service role can insert feed items"
ON public.feed_items
FOR INSERT
TO service_role
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can delete feed items"
ON public.feed_items
FOR DELETE
TO service_role
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert user badges"
ON public.user_badges
FOR INSERT
TO service_role
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can insert user milestones"
ON public.user_milestones
FOR INSERT
TO service_role
WITH CHECK (auth.role() = 'service_role');