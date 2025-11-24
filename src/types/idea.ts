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
  market_insight: string | null;
  problem_intensity: string | null;
  competition_snapshot: string | null;
  pricing_power: string | null;
  success_likelihood: string | null;
  biggest_risks: any;
  unfair_advantages: any;
  recommendations: any;
  ideal_customer_profile: string | null;
  elevator_pitch: string | null;
  brutal_honesty: string | null;
  created_at: string;
}
