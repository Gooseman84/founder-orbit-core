create table if not exists founder_blueprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),

  status text not null default 'active',    -- active | archived | draft
  version integer not null default 1,

  -- LIFE SIDE
  life_vision text,
  life_time_horizon text,
  income_target numeric,
  time_available_hours_per_week integer,
  capital_available numeric,
  risk_profile text,
  non_negotiables text,
  current_commitments text,

  strengths text,
  weaknesses text,
  preferred_work_style text,
  energy_pattern text,

  -- BUSINESS SIDE
  north_star_idea_id uuid,
  north_star_one_liner text,
  target_audience text,
  problem_statement text,
  promise_statement text,
  offer_model text,
  monetization_strategy text,
  distribution_channels text,
  unfair_advantage text,

  traction_definition text,
  success_metrics jsonb,
  runway_notes text,

  validation_stage text,
  focus_quarters jsonb,

  -- AI
  ai_summary text,
  ai_recommendations jsonb,
  last_refreshed_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table founder_blueprints enable row level security;

create policy "Users manage own blueprint"
on founder_blueprints for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);