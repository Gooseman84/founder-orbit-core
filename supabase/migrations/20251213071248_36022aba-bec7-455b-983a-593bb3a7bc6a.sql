-- Drop and recreate view with SECURITY INVOKER (default, but explicit)
DROP VIEW IF EXISTS public.user_subscription_info;

CREATE VIEW public.user_subscription_info 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  plan,
  status,
  renewal_period,
  current_period_end,
  cancel_at,
  created_at
FROM public.user_subscriptions;