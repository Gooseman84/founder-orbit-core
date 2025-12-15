-- Update get_user_total_xp function to only allow users to query their own XP
-- This prevents any authenticated user from querying other users' XP data

CREATE OR REPLACE FUNCTION public.get_user_total_xp(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM public.xp_events
  WHERE user_id = p_user_id
    AND user_id = auth.uid();  -- Only allow querying own XP
$$;