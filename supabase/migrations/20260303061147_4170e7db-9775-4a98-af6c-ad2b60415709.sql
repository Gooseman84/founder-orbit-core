
-- Fix overly permissive RLS on frameworks table
-- Drop the current permissive policy
DROP POLICY IF EXISTS "Service role manages frameworks" ON public.frameworks;

-- Create proper policies: service role for writes, authenticated for reads
CREATE POLICY "Service role manages frameworks"
ON public.frameworks
FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Authenticated users can read frameworks"
ON public.frameworks
FOR SELECT
USING (auth.uid() IS NOT NULL);
