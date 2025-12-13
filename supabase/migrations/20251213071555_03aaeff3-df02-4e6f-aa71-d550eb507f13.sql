-- Create a security definer function to return safe subscription data
CREATE OR REPLACE FUNCTION public.get_user_subscription(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  plan text,
  status text,
  renewal_period text,
  current_period_end timestamptz,
  cancel_at timestamptz,
  created_at timestamptz
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
  WHERE user_subscriptions.user_id = p_user_id;
$$;

-- Drop the old view since we'll use the function instead
DROP VIEW IF EXISTS public.user_subscription_info;

-- Remove the user SELECT policy on user_subscriptions table
-- Users should only access subscription data through the function
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;

-- Keep service role access for webhooks and backend operations
-- The existing "Service role can manage all subscriptions" policy handles this