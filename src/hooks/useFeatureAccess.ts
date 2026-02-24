import { useSubscription } from "@/hooks/useSubscription";
import { 
  canUseFeature, 
  getPlanFeatures, 
  hasPaidPlan, 
  getPlanDisplayInfo,
  type PlanId,
  type PlanFeatures 
} from "@/lib/entitlements";
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
  } = useSubscription();
  
  const derivedState = useMemo(() => {
    const plan: PlanId = (rawPlan === "pro" || rawPlan === "founder") 
      ? rawPlan 
      : "free";
    
    const hasPro = hasPaidPlan(plan) && (status === "active" || status === "trialing");
    const hasFounder = plan === "founder" && (status === "active" || status === "trialing");
    
    const features = getPlanFeatures(plan);
    const planInfo = getPlanDisplayInfo(plan);
    
    return {
      plan,
      hasPro,
      hasFounder,
      features,
      planInfo,
    };
  }, [rawPlan, status]);

  const gate = (featureName: string): boolean => {
    if (derivedState.hasPro || derivedState.hasFounder) {
      return canUseFeature(derivedState.plan, featureName);
    }
    return canUseFeature("free", featureName);
  };

  return {
    ...derivedState,
    isTrialing: false,
    hasTrialAccess: false,
    isTrialExpired: false,
    isLockedOut: false,
    daysRemaining: null,
    gate,
    loading,
  };
};
