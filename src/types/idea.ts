// Type definitions for ideas and idea-related data structures

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  business_model_type: string | null;
  target_customer: string | null;
  time_to_first_dollar: string | null;
  complexity: string | null;
  passion_fit_score: number | null;
  skill_fit_score: number | null;
  constraint_fit_score: number | null;
  lifestyle_fit_score: number | null;
  overall_fit_score: number | null;
  status: string | null;
  created_at: string;
}

export interface IdeaAnalysis {
  id: string;
  user_id: string;
  idea_id: string;
  niche_score: number | null;
  market_overview: string | null;
  problem_intensity: string | null;
  competition_snapshot: string | null;
  pricing_range: string | null;
  main_risks: any;
  brutal_take: string | null;
  suggested_modifications: string | null;
  created_at: string;
}
