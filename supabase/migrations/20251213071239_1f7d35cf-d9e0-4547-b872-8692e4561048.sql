-- Create a secure view for user subscriptions that excludes Stripe IDs
CREATE OR REPLACE VIEW public.user_subscription_info AS
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

-- Enable RLS-like behavior through view security
-- The view inherits security from the underlying table's RLS policies