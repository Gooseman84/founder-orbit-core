CREATE POLICY "Users can update their own financial viability scores"
  ON public.financial_viability_scores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);