-- Add default value 'free' to plan column in user_subscriptions
ALTER TABLE public.user_subscriptions 
ALTER COLUMN plan SET DEFAULT 'free';