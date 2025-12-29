// Type definitions for ventures and venture plans

// Venture state machine states
export type VentureState = "inactive" | "committed" | "executing" | "reviewed" | "killed";

// Commitment window options
export type CommitmentWindowDays = 14 | 30 | 90;

// Legacy status type (for backwards compatibility during migration)
export type VentureStatus = "active" | "paused" | "archived";

export interface Venture {
  id: string;
  user_id: string;
  idea_id: string | null;
  name: string;
  status: VentureStatus; // Legacy field
  venture_state: VentureState;
  commitment_window_days: CommitmentWindowDays | null;
  commitment_start_at: string | null;
  commitment_end_at: string | null;
  success_metric: string | null;
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

// State machine transition rules
export const VALID_STATE_TRANSITIONS: Record<VentureState, VentureState[]> = {
  inactive: ["committed"],
  committed: ["executing", "inactive"],
  executing: ["reviewed"],
  reviewed: ["committed", "inactive", "killed"],
  killed: [], // Terminal state - no transitions allowed
};

// State machine helpers
export function canTransitionTo(currentState: VentureState, targetState: VentureState): boolean {
  return VALID_STATE_TRANSITIONS[currentState]?.includes(targetState) ?? false;
}

export function isActiveVentureState(state: VentureState): boolean {
  return state === "committed" || state === "executing" || state === "reviewed";
}

export function isTerminalState(state: VentureState): boolean {
  return state === "killed";
}

// Action permission helpers based on venture state
export function canGenerateTasks(state: VentureState): boolean {
  return state === "executing";
}

export function canGenerateExecutionAdvice(state: VentureState): boolean {
  return state === "executing";
}

export function canEditIdeaFundamentals(state: VentureState): boolean {
  // Can only edit when inactive (before commitment)
  return state === "inactive";
}

export function canAccessIdeationTools(state: VentureState): boolean {
  // Cannot access ideation while executing
  return state !== "executing";
}

// Commitment validation
export interface CommitmentFields {
  commitment_window_days: CommitmentWindowDays | null;
  commitment_start_at: string | null;
  commitment_end_at: string | null;
  success_metric: string | null;
}

export function hasValidCommitmentFields(fields: CommitmentFields): boolean {
  return (
    fields.commitment_window_days !== null &&
    fields.commitment_start_at !== null &&
    fields.commitment_end_at !== null &&
    fields.success_metric !== null &&
    fields.success_metric.trim() !== ""
  );
}
