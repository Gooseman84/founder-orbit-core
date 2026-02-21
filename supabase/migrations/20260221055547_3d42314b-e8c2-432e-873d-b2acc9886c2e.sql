
-- Add network_advantage JSONB column to founder_blueprints
ALTER TABLE public.founder_blueprints
ADD COLUMN network_advantage jsonb DEFAULT NULL;

COMMENT ON COLUMN public.founder_blueprints.network_advantage IS 'AI-generated network advantage analysis with first_ten_customers, distribution_channel, credibility_signal, fvs_impact';
