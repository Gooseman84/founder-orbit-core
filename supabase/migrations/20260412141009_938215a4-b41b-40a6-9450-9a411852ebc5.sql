
-- Drop unused tables (all code references removed)
DROP TABLE IF EXISTS public.feed_items CASCADE;
DROP TABLE IF EXISTS public.pulse_checks CASCADE;
DROP TABLE IF EXISTS public.check_ins CASCADE;
DROP TABLE IF EXISTS public.onboarding_analytics CASCADE;

-- Add performance indexes on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON public.ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_user_created ON public.ideas(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ventures_user_state ON public.ventures(user_id, venture_state);
CREATE INDEX IF NOT EXISTS idx_tasks_venture_id ON public.tasks(venture_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_daily_reflections_user_date ON public.daily_reflections(user_id, reflection_date DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_documents_user ON public.workspace_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_market_validations_idea ON public.market_validations(idea_id);
CREATE INDEX IF NOT EXISTS idx_financial_viability_scores_idea ON public.financial_viability_scores(idea_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_scores_idea ON public.opportunity_scores(idea_id);
CREATE INDEX IF NOT EXISTS idx_founder_patterns_user ON public.founder_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_venture_daily_tasks_venture ON public.venture_daily_tasks(venture_id);
CREATE INDEX IF NOT EXISTS idx_venture_daily_checkins_venture ON public.venture_daily_checkins(venture_id);

-- Add table documentation comments
COMMENT ON TABLE public.ideas IS 'Business ideas generated or imported by founders. Core entity for the ideation phase.';
COMMENT ON TABLE public.ventures IS 'Committed ventures — one active per user. Tracks state machine (inactive → executing → reviewed → killed).';
COMMENT ON TABLE public.tasks IS 'User tasks tied to ventures or ideas. Includes AI-generated and manually created tasks.';
COMMENT ON TABLE public.founder_profiles IS 'Founder context: skills, goals, constraints, interview data. Drives all AI personalization.';
COMMENT ON TABLE public.founder_interviews IS 'Mavrik interview transcripts and extracted context summaries.';
COMMENT ON TABLE public.founder_blueprints IS 'AI-generated business and life blueprints for the founder.';
COMMENT ON TABLE public.workspace_documents IS 'Rich-text documents in the venture workspace. Scoped to active venture.';
COMMENT ON TABLE public.daily_reflections IS 'Daily founder reflections with AI-generated insights and suggested tasks.';
COMMENT ON TABLE public.market_validations IS 'Real-time market validation data from Perplexity API — demand signals, competitors, timing.';
COMMENT ON TABLE public.financial_viability_scores IS 'Multi-dimensional financial viability scoring for ideas.';
COMMENT ON TABLE public.implementation_kits IS 'SaaS Vibe Coding Kit — spec, architecture, and deployment config for a venture.';
COMMENT ON TABLE public.venture_daily_tasks IS 'AI-generated daily execution tasks scoped to a venture.';
COMMENT ON TABLE public.venture_daily_checkins IS 'Daily check-ins during execution phase with Mavrik coaching responses.';
COMMENT ON TABLE public.validation_evidence IS 'Evidence logged against FVS dimensions during venture validation.';
COMMENT ON TABLE public.founder_patterns IS 'AI-detected behavioral patterns (scope creep, execution paralysis, etc.).';
COMMENT ON TABLE public.user_subscriptions IS 'Stripe subscription state synced via webhook.';
COMMENT ON TABLE public.frameworks IS 'Internal AI prompt frameworks injected into edge function calls. Service-role only.';
