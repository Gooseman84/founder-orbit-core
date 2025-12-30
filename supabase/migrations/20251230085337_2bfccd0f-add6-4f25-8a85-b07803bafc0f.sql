-- Create venture_daily_tasks table for storing daily AI-generated tasks
CREATE TABLE public.venture_daily_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  venture_id UUID NOT NULL REFERENCES public.ventures(id) ON DELETE CASCADE,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(venture_id, task_date)
);

-- Create venture_daily_checkins table for daily check-in submissions
CREATE TABLE public.venture_daily_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  venture_id UUID NOT NULL REFERENCES public.ventures(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completion_status TEXT NOT NULL CHECK (completion_status IN ('yes', 'partial', 'no')),
  explanation TEXT,
  reflection TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(venture_id, checkin_date)
);

-- Enable RLS on venture_daily_tasks
ALTER TABLE public.venture_daily_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for venture_daily_tasks
CREATE POLICY "Users can view their own daily tasks"
  ON public.venture_daily_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily tasks"
  ON public.venture_daily_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily tasks"
  ON public.venture_daily_tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS on venture_daily_checkins
ALTER TABLE public.venture_daily_checkins ENABLE ROW LEVEL SECURITY;

-- RLS policies for venture_daily_checkins
CREATE POLICY "Users can view their own daily check-ins"
  ON public.venture_daily_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily check-ins"
  ON public.venture_daily_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily check-ins"
  ON public.venture_daily_checkins FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger for venture_daily_tasks
CREATE TRIGGER update_venture_daily_tasks_updated_at
  BEFORE UPDATE ON public.venture_daily_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();