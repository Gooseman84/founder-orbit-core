// Type definitions for ideas and idea-related data structures

// Generation modes for EPIC v6 idea engine
export type IdeaGenerationMode = 
  | "breadth" 
  | "focus" 
  | "creator" 
  | "automation" 
  | "persona" 
  | "boundless" 
  | "locker_room" 
  | "chaos" 
  | "money_printer" 
  | "memetic";

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
  
  // EPIC v6 fields
  category: string | null;
  mode: IdeaGenerationMode | null;
  platform: string | null;
  shock_factor: number | null;
  virality_potential: number | null;
  leverage_score: number | null;
  automation_density: number | null;
  autonomy_level: number | null;
  culture_tailwind: number | null;
  chaos_factor: number | null;
  engine_version: string | null;
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
