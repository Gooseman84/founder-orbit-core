/**
 * Types for the Founder Blueprint feature.
 *
 * These mirror the structure of the `founder_blueprints` table and the
 * AI recommendation objects used by refresh-blueprint and related flows.
 */

export type BlueprintStatus = "active" | "archived" | "draft";

export type ValidationStage =
  | "idea"
  | "problem_validated"
  | "offer_validated"
  | "revenue"
  | "unknown";

export type RecommendationPriority = "high" | "medium" | "low";

export type RecommendationTimeHorizon =
  | "today"
  | "this_week"
  | "this_month"
  | "this_quarter";

export type RecommendationCategory =
  | "validation"
  | "audience"
  | "offer"
  | "distribution"
  | "systems"
  | "mindset";

/**
 * A single AI-generated recommendation for next steps.
 */
export interface AIRecommendation {
  title: string;
  description: string;
  priority: RecommendationPriority;
  time_horizon: RecommendationTimeHorizon;
  category: RecommendationCategory;
  suggested_task_count: number;
}

/**
 * Life-side of the Blueprint: constraints, vision, and personal context.
 */
export interface LifeBlueprint {
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
}

/**
 * Business-side of the Blueprint: idea, offer, and go-to-market.
 */
export interface BusinessBlueprint {
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
}

/**
 * Full Founder Blueprint entry as stored in the database.
 */
export interface FounderBlueprint extends LifeBlueprint, BusinessBlueprint {
  id: string;
  user_id: string;
  status: BlueprintStatus;
  version: number;
  ai_summary: string | null;
  ai_recommendations: AIRecommendation[] | null;
  last_refreshed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Payload used when editing parts of the Blueprint from the UI.
 * All fields are optional; only changed fields need to be included.
 */
export type BlueprintEditPayload = Partial<
  LifeBlueprint &
    BusinessBlueprint & {
      status: BlueprintStatus;
      version: number;
    }
>;
