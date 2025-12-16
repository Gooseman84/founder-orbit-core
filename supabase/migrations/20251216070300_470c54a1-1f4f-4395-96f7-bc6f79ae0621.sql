-- Fix get_user_subscription to require user to query only their own data
CREATE OR REPLACE FUNCTION public.get_user_subscription(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  plan text,
  status text,
  renewal_period text,
  current_period_end timestamp with time zone,
  cancel_at timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    user_id,
    plan,
    status,
    renewal_period,
    current_period_end,
    cancel_at,
    created_at
  FROM public.user_subscriptions
  WHERE user_subscriptions.user_id = p_user_id
    AND p_user_id = auth.uid(); -- Only allow querying own subscription data
$$;