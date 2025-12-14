-- 1. Add SELECT RLS policy for user_subscriptions so users can read their own subscription
CREATE POLICY "Users can read own subscription"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Clean up any orphan opportunity_scores that reference non-existent ideas
DELETE FROM public.opportunity_scores
WHERE idea_id NOT IN (SELECT id FROM public.ideas);

-- 3. Add foreign key constraint from opportunity_scores.idea_id to ideas.id
ALTER TABLE public.opportunity_scores
ADD CONSTRAINT opportunity_scores_idea_id_fkey
  FOREIGN KEY (idea_id)
  REFERENCES public.ideas(id)
  ON DELETE CASCADE;