
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_name TEXT,
  page_url TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert error logs"
ON public.error_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own error logs"
ON public.error_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE INDEX idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX idx_error_logs_user_id ON public.error_logs (user_id);
