// Type definitions for ventures and venture plans

// Venture state machine states
// Note: "committed" is deprecated - we transition directly from inactive to executing
export type VentureState = "inactive" | "executing" | "reviewed" | "killed";

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
  inactive: ["executing"], // Direct start
  executing: ["reviewed"],
  reviewed: ["executing", "inactive", "killed"], // continue, pivot, kill
  killed: [], // Terminal state - no transitions allowed
};

// State machine helpers
export function canTransitionTo(currentState: VentureState, targetState: VentureState): boolean {
  return VALID_STATE_TRANSITIONS[currentState]?.includes(targetState) ?? false;
}

export function isActiveVentureState(state: VentureState): boolean {
  return state === "executing" || state === "reviewed";
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

// CommitmentDraft: Contains planning fields (window + metric) but not execution timestamps
// Used for intermediate validation before starting execution
export interface CommitmentDraft {
  commitment_window_days: CommitmentWindowDays;
  success_metric: string;
}

// CommitmentFull: Required for transitioning to 'executing' state
// Contains all fields including start/end timestamps
export interface CommitmentFull extends CommitmentDraft {
  commitment_start_at: string;
  commitment_end_at: string;
}

// Legacy interface for backwards compatibility
export interface CommitmentFields {
  commitment_window_days: CommitmentWindowDays | null;
  commitment_start_at: string | null;
  commitment_end_at: string | null;
  success_metric: string | null;
}

export function isValidCommitmentDraft(data: Partial<CommitmentDraft>): data is CommitmentDraft {
  return (
    data.commitment_window_days !== undefined &&
    data.commitment_window_days !== null &&
    data.success_metric !== undefined &&
    data.success_metric !== null &&
    data.success_metric.trim() !== ""
  );
}

export function isValidCommitmentFull(data: Partial<CommitmentFull>): data is CommitmentFull {
  return (
    isValidCommitmentDraft(data) &&
    'commitment_start_at' in data &&
    data.commitment_start_at !== undefined &&
    data.commitment_start_at !== null &&
    'commitment_end_at' in data &&
    data.commitment_end_at !== undefined &&
    data.commitment_end_at !== null
  );
}

// Legacy function for backwards compatibility
export function hasValidCommitmentFields(fields: CommitmentFields): boolean {
  return (
    fields.commitment_window_days !== null &&
    fields.commitment_start_at !== null &&
    fields.commitment_end_at !== null &&
    fields.success_metric !== null &&
    fields.success_metric.trim() !== ""
  );
}
