-- Add unique constraint on user_id for upsert to work
ALTER TABLE public.user_subscriptions
ADD CONSTRAINT user_subscriptions_user_id_unique UNIQUE (user_id);