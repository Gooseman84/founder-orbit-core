-- EPIC v6 Schema Upgrades: Extend ideas and founder_profiles tables

-- Add new v6 fields to ideas table
ALTER TABLE ideas
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS mode text,
ADD COLUMN IF NOT EXISTS platform text,
ADD COLUMN IF NOT EXISTS shock_factor numeric,
ADD COLUMN IF NOT EXISTS virality_potential numeric,
ADD COLUMN IF NOT EXISTS leverage_score numeric,
ADD COLUMN IF NOT EXISTS automation_density numeric,
ADD COLUMN IF NOT EXISTS autonomy_level numeric,
ADD COLUMN IF NOT EXISTS culture_tailwind numeric,
ADD COLUMN IF NOT EXISTS chaos_factor numeric,
ADD COLUMN IF NOT EXISTS engine_version text DEFAULT 'v6';

-- Add new v6 fields to founder_profiles table
ALTER TABLE founder_profiles
ADD COLUMN IF NOT EXISTS work_personality text[],
ADD COLUMN IF NOT EXISTS creator_platforms text[],
ADD COLUMN IF NOT EXISTS edgy_mode text,
ADD COLUMN IF NOT EXISTS wants_money_systems boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS open_to_personas boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS open_to_memetic_ideas boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN ideas.category IS 'Idea category: business, money_system, creator, automation, etc.';
COMMENT ON COLUMN ideas.mode IS 'Generation mode: breadth, focus, creator, automation, persona, boundless, locker_room, chaos, money_printer, memetic';
COMMENT ON COLUMN ideas.platform IS 'Primary platform: tiktok, youtube, instagram, x, linkedin, email, none';
COMMENT ON COLUMN ideas.shock_factor IS 'How unconventional/edgy the idea is (0-100)';
COMMENT ON COLUMN ideas.virality_potential IS 'Viral growth potential score (0-100)';
COMMENT ON COLUMN ideas.leverage_score IS 'Leverage and scalability score (0-100)';
COMMENT ON COLUMN ideas.automation_density IS 'How automated the business can be (0-100)';
COMMENT ON COLUMN ideas.autonomy_level IS 'Founder time freedom potential (0-100)';
COMMENT ON COLUMN ideas.culture_tailwind IS 'Alignment with cultural trends (0-100)';
COMMENT ON COLUMN ideas.chaos_factor IS 'Unpredictability/experimentation level (0-100)';
COMMENT ON COLUMN ideas.engine_version IS 'Ideation engine version that generated this idea';

COMMENT ON COLUMN founder_profiles.work_personality IS 'Work style: builder, creator, automation, faceless, dealmaker, quiet_assassin';
COMMENT ON COLUMN founder_profiles.creator_platforms IS 'Preferred platforms: tiktok, instagram, youtube, x, linkedin, email, none';
COMMENT ON COLUMN founder_profiles.edgy_mode IS 'Comfort with edgy ideas: safe, bold, unhinged';
COMMENT ON COLUMN founder_profiles.wants_money_systems IS 'Prefers money-making systems over traditional businesses';
COMMENT ON COLUMN founder_profiles.open_to_personas IS 'Open to AI personas/characters';
COMMENT ON COLUMN founder_profiles.open_to_memetic_ideas IS 'Open to memetic/culture-driven ideas';