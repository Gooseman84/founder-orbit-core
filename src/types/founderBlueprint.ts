export interface FounderBlueprint {
  id: string;
  user_id: string;

  status: 'active' | 'archived' | 'draft';
  version: number;

  // LIFE SIDE
  life_vision: string | null;
  life_time_horizon: string | null;
  income_target: number | null;
  time_available_hours_per_week: number | null;
  capital_available: number | null;
  risk_profile: string | null;
  non_negotiables: string | null;
  current_commitments: string | null;

  strengths: string | null;
  weaknesses: string | null;
  preferred_work_style: string | null;
  energy_pattern: string | null;

  // BUSINESS SIDE
  north_star_idea_id: string | null;
  north_star_one_liner: string | null;
  target_audience: string | null;
  problem_statement: string | null;
  promise_statement: string | null;
  offer_model: string | null;
  monetization_strategy: string | null;
  distribution_channels: string | null;
  unfair_advantage: string | null;

  traction_definition: string | null;
  success_metrics: Record<string, unknown> | null;
  runway_notes: string | null;

  validation_stage: string | null;
  focus_quarters: Record<string, unknown>[] | null;

  // AI
  ai_summary: string | null;
  ai_recommendations: Record<string, unknown>[] | null;
  last_refreshed_at: string | null;

  created_at: string;
  updated_at: string;
}
