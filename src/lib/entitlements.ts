// Entitlements helper for checking user plan features
// This centralizes all plan-based feature access logic.

import { PLAN_FEATURES, FEATURE_GATE_MAP, isPaidPlan } from "@/config/plans";
import type { PlanId, PlanFeatures } from "@/config/plans";
import { supabase } from "@/integrations/supabase/client";

// Re-export types for convenience
export type { PlanId, PlanFeatures } from "@/config/plans";

// Cache for user plans to avoid repeated DB calls
const planCache = new Map<string, { plan: PlanId; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Get the user's current plan from the database
 * Returns "free" if no subscription found or subscription is inactive
 */
export async function getUserPlan(userId: string): Promise<PlanId> {
  // Check cache first
  const cached = planCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.plan;
  }
  
  try {
    const { data, error } = await supabase
      .rpc("get_user_subscription", { p_user_id: userId })
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching user subscription:", error);
      return "free";
    }
    
    // Support both active and trialing statuses
    if (!data || (data.status !== "active" && data.status !== "trialing")) {
      return "free";
    }
    
    const plan = (data.plan as PlanId) || "free";
    
    // Cache the result
    planCache.set(userId, { plan, timestamp: Date.now() });
    
    return plan;
  } catch (err) {
    console.error("Error in getUserPlan:", err);
    return "free";
  }
}

/**
 * Get all features for a given plan
 */
export function getPlanFeatures(plan: PlanId): PlanFeatures {
  return PLAN_FEATURES[plan] || PLAN_FEATURES.free;
}

/**
 * Check if a plan has access to a specific feature
 * @param plan - The user's plan ID
 * @param feature - Either a feature key from FEATURE_GATE_MAP or a direct PlanFeatures key
 */
export function canUseFeature(
  plan: PlanId, 
  feature: string | keyof PlanFeatures
): boolean {
  const features = getPlanFeatures(plan);
  
  // First check if it's a legacy feature gate key
  const mappedFeature = FEATURE_GATE_MAP[feature];
  const featureKey = mappedFeature || (feature as keyof PlanFeatures);
  
  const value = features[featureKey];
  
  // Handle different value types
  if (typeof value === "boolean") {
    return value;
  }
  
  if (typeof value === "number") {
    return value > 0;
  }
  
  if (typeof value === "string") {
    // For string values like "limited" | "full", "full" means full access
    return value === "full" || value === "all";
  }
  
  return false;
}

/**
 * Check if user has a paid plan (pro or founder)
 */
export function hasPaidPlan(plan: PlanId): boolean {
  return isPaidPlan(plan);
}

/**
 * Clear the plan cache for a user (call after subscription changes)
 */
export function clearPlanCache(userId?: string): void {
  if (userId) {
    planCache.delete(userId);
  } else {
    planCache.clear();
  }
}

/**
 * Get display info for a plan
 */
export function getPlanDisplayInfo(plan: PlanId) {
  const features = getPlanFeatures(plan);
  return {
    name: features.displayName,
    description: features.description,
    monthlyPrice: features.monthlyPrice,
    yearlyPrice: features.yearlyPrice,
    isPaid: isPaidPlan(plan),
  };
}

/**
 * Server-side plan check for edge functions
 * This is used in edge functions to validate subscription status
 */
export async function validateServerSidePlan(
  supabaseClient: typeof supabase,
  userId: string
): Promise<{ plan: PlanId; isPro: boolean; isFounder: boolean }> {
  const { data, error } = await supabaseClient
    .from("user_subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();
  
  // Support both active and trialing statuses
  if (error || !data || (data.status !== "active" && data.status !== "trialing")) {
    return { plan: "free", isPro: false, isFounder: false };
  }
  
  const plan = (data.plan as PlanId) || "free";
  
  return {
    plan,
    isPro: plan === "pro" || plan === "founder",
    isFounder: plan === "founder",
  };
}
