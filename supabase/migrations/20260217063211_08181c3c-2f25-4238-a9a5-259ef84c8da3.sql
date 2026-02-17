
-- Step 1: Add trial_end column
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

-- Step 2: Drop old function signature
DROP FUNCTION IF EXISTS public.get_user_subscription(uuid);

-- Step 3: Recreate with trial_end
CREATE FUNCTION public.get_user_subscription(p_user_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, plan text, status text, renewal_period text, current_period_end timestamp with time zone, cancel_at timestamp with time zone, created_at timestamp with time zone, trial_end timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    id,
    user_id,
    plan,
    status,
    renewal_period,
    current_period_end,
    cancel_at,
    created_at,
    trial_end
  FROM public.user_subscriptions
  WHERE user_subscriptions.user_id = p_user_id
    AND p_user_id = auth.uid();
$function$;
