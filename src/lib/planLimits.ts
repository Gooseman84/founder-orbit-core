// Plan limit checking utilities for frontend use
// These functions check current usage against plan limits

import { supabase } from "@/integrations/supabase/client";
import { PLAN_FEATURES, type PlanId, type IdeaMode, FREE_MODES, isPaidPlan } from "@/config/plans";

/**
 * Count total idea generations for the user
 */
export async function countTotalGenerations(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("founder_generated_ideas")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  
  if (error) {
    console.error("Error counting generations:", error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Count idea generations for today (legacy, used for display)
 */
export async function countTodayGenerations(userId: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  
  const { count, error } = await supabase
    .from("founder_generated_ideas")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00.000Z`);
  
  if (error) {
    console.error("Error counting generations:", error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Check if user can generate more ideas
 * - Free users: limited to maxIdeaGenerationsTotal
 * - Pro/Founder users: unlimited
 */
export async function canGenerateIdeas(
  userId: string, 
  plan: PlanId, 
): Promise<{ allowed: boolean; remaining: number; limit: number; reason?: string }> {
  const limit = PLAN_FEATURES[plan].maxIdeaGenerationsTotal;
  
  // Paid plans have unlimited generations
  if (isPaidPlan(plan) || limit === Infinity) {
    return { allowed: true, remaining: Infinity, limit };
  }
  
  // Free users - check total generations
  const count = await countTotalGenerations(userId);
  const remaining = Math.max(0, limit - count);
  
  return { 
    allowed: remaining > 0, 
    remaining, 
    limit,
    reason: remaining <= 0 ? "You've used all your free idea generations. Upgrade to Pro for unlimited." : undefined
  };
}

/**
 * Check if a mode is allowed for the user's plan
 */
export function isModeAllowed(mode: IdeaMode, plan: PlanId): boolean {
  const features = PLAN_FEATURES[plan];
  
  if (features.allowedIdeaModes === "all") {
    return true;
  }
  
  return features.allowedIdeaModes.includes(mode);
}

/**
 * Count saved ideas in library
 */
export async function countSavedIdeas(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("ideas")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  
  if (error) {
    console.error("Error counting saved ideas:", error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Check if user can save more ideas
 */
export async function canSaveIdea(userId: string, plan: PlanId): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = PLAN_FEATURES[plan].maxSavedIdeas;
  
  if (limit === Infinity) {
    return { allowed: true, remaining: Infinity, limit };
  }
  
  const count = await countSavedIdeas(userId);
  const remaining = Math.max(0, limit - count);
  
  return { allowed: remaining > 0, remaining, limit };
}

/**
 * Count blueprints
 */
export async function countBlueprints(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("founder_blueprints")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  
  if (error) {
    console.error("Error counting blueprints:", error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Check if user can create more blueprints
 */
export async function canCreateBlueprint(userId: string, plan: PlanId): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = PLAN_FEATURES[plan].maxBlueprints;
  
  if (limit === Infinity) {
    return { allowed: true, remaining: Infinity, limit };
  }
  
  const count = await countBlueprints(userId);
  const remaining = Math.max(0, limit - count);
  
  return { allowed: remaining > 0, remaining, limit };
}

/**
 * Count workspace documents
 */
export async function countWorkspaceDocs(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("workspace_documents")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  
  if (error) {
    console.error("Error counting workspace docs:", error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Check if user can create more workspace docs
 */
export async function canCreateWorkspaceDoc(userId: string, plan: PlanId): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = PLAN_FEATURES[plan].maxWorkspaceDocs;
  
  if (limit === Infinity) {
    return { allowed: true, remaining: Infinity, limit };
  }
  
  const count = await countWorkspaceDocs(userId);
  const remaining = Math.max(0, limit - count);
  
  return { allowed: remaining > 0, remaining, limit };
}
