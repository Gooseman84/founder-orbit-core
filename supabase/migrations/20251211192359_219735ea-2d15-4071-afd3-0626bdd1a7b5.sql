-- Add missing INSERT policy for daily_streaks table
CREATE POLICY "Users can create their own streak"
ON public.daily_streaks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);