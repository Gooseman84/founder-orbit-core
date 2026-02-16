import { useSubscription } from "@/hooks/useSubscription";
import { 
  canUseFeature, 
  getPlanFeatures, 
  hasPaidPlan, 
  getPlanDisplayInfo,
  type PlanId,
  type PlanFeatures 
} from "@/lib/entitlements";
import { PLAN_FEATURES, TRIAL_DURATION_DAYS } from "@/config/plans";
import { useMemo } from "react";

interface UseFeatureAccessReturn {
  plan: PlanId;
  hasPro: boolean;
  hasFounder: boolean;
  isTrialing: boolean;
  hasTrialAccess: boolean;
  isTrialExpired: boolean;
  isLockedOut: boolean;
  daysRemaining: number | null;
  gate: (featureName: string) => boolean;
  features: PlanFeatures;
  planInfo: ReturnType<typeof getPlanDisplayInfo>;
  loading: boolean;
}

export const useFeatureAccess = (): UseFeatureAccessReturn => {
  const { 
    plan: rawPlan, 
    status, 
    loading, 
    isTrialing, 
    isTrialExpired: subscriptionTrialExpired,
    daysUntilTrialEnd
  } = useSubscription();
  
  // Compute derived state
  const derivedState = useMemo(() => {
    // Normalize plan to valid PlanId
    const plan: PlanId = (rawPlan === "pro" || rawPlan === "founder") 
      ? rawPlan 
      : "trial";
    
    // Check if user has paid Pro subscription (not trialing)
    const hasPro = hasPaidPlan(plan) && status === "active";
    const hasFounder = plan === "founder" && status === "active";
    
    // Trial-specific states
    const hasTrialAccess = isTrialing && !subscriptionTrialExpired;
    
    // Trial expired: time-based from useSubscription
    const isTrialExpired = subscriptionTrialExpired && !hasPro && !hasFounder;
    
    // Locked out: trial expired and no active subscription
    const isLockedOut = isTrialExpired;
    
    // Days remaining in trial
    const daysRemaining = isTrialing ? daysUntilTrialEnd : null;
    
    const features = getPlanFeatures(plan);
    const planInfo = getPlanDisplayInfo(plan);
    
    return {
      plan,
      hasPro,
      hasFounder,
      hasTrialAccess,
      isTrialExpired,
      isLockedOut,
      daysRemaining,
      features,
      planInfo,
    };
  }, [rawPlan, status, isTrialing, subscriptionTrialExpired, daysUntilTrialEnd]);

  const gate = (featureName: string): boolean => {
    // Locked out users can't access any features
    if (derivedState.isLockedOut) {
      return false;
    }
    
    // Pro/Founder users have full access
    if (derivedState.hasPro || derivedState.hasFounder) {
      return canUseFeature(derivedState.plan, featureName);
    }
    
    // Active trial users get trial-level access
    if (derivedState.hasTrialAccess) {
      return canUseFeature("trial", featureName);
    }
    
    // Default: check trial plan features
    return canUseFeature("trial", featureName);
  };

  return {
    ...derivedState,
    isTrialing,
    gate,
    loading,
  };
};
