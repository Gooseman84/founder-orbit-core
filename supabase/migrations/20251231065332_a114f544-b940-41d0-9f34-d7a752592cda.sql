-- Add append_count column to track how many times additional tasks were generated today
ALTER TABLE public.venture_daily_tasks 
ADD COLUMN IF NOT EXISTS append_count integer NOT NULL DEFAULT 0;