CREATE POLICY "Users can read their own feedback"
ON public.beta_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);