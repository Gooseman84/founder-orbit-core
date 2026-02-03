-- Fix RLS policies for founder_profiles table
-- Drop and recreate SELECT policy to require authentication
DROP POLICY IF EXISTS "Users can view their own profile" ON public.founder_profiles;

CREATE POLICY "Users can view their own profile" 
ON public.founder_profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Fix RLS policies for user_subscriptions table  
-- Drop and recreate SELECT policy to require authentication
DROP POLICY IF EXISTS "Users can read own subscription" ON public.user_subscriptions;

CREATE POLICY "Users can read own subscription" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Also fix the UPDATE policy for user_subscriptions to require auth
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;

CREATE POLICY "Users can update their own subscription" 
ON public.user_subscriptions 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);