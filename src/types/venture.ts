// Type definitions for ventures and venture plans

export type VentureStatus = "active" | "paused" | "archived";

export interface Venture {
  id: string;
  user_id: string;
  idea_id: string | null;
  name: string;
  status: VentureStatus;
  created_at: string;
  updated_at: string;
}

export type VenturePlanType = "30_day";

export interface VenturePlan {
  id: string;
  user_id: string;
  venture_id: string;
  plan_type: VenturePlanType;
  start_date: string; // ISO date
  end_date: string;   // ISO date
  summary: string | null;
  ai_raw: unknown;
  created_at: string;
  updated_at: string;
}

export interface VenturePlanWeek {
  weekNumber: number; // 1-4
  theme: string;
  summary: string;
  tasks: VenturePlanTaskInput[];
}

export type VenturePlanTaskCategory = 
  | "validation" 
  | "build" 
  | "marketing" 
  | "systems" 
  | "ops" 
  | "other";

export interface VenturePlanTaskInput {
  title: string;
  description: string;
  weekNumber: number;
  suggestedDueOffsetDays: number | null;
  estimatedMinutes: number | null;
  category: VenturePlanTaskCategory;
}

export interface VenturePlanAIResponse {
  summary: string;
  startDate: string;
  endDate: string;
  weeks: VenturePlanWeek[];
}

export interface GenerateVenturePlanRequest {
  ventureId: string;
  planType?: VenturePlanType;
  startDate?: string; // optional ISO, otherwise today
}

export interface GenerateVenturePlanResponse {
  plan: VenturePlan;
  tasksCreated: string[];
}
