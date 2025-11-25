-- Add new columns to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS feed_item_id uuid,
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Update default values
ALTER TABLE public.tasks
ALTER COLUMN status SET DEFAULT 'pending',
ALTER COLUMN xp_reward SET DEFAULT 10;