import { useSubscription } from "@/hooks/useSubscription";
import { 
  canUseFeature, 
  getPlanFeatures, 
  hasPaidPlan, 
  getPlanDisplayInfo,
  type PlanId,
  type PlanFeatures 
} from "@/lib/entitlements";
import { PLAN_FEATURES } from "@/config/plans";

interface UseFeatureAccessReturn {
  plan: PlanId;
  hasPro: boolean;
  hasFounder: boolean;
  isTrialing: boolean;
  gate: (featureName: string) => boolean;
  features: PlanFeatures;
  planInfo: ReturnType<typeof getPlanDisplayInfo>;
  loading: boolean;
}

export const useFeatureAccess = (): UseFeatureAccessReturn => {
  const { plan: rawPlan, status, loading, isTrialing } = useSubscription();
  
  // Normalize plan to valid PlanId
  // For trialing users, they should have Pro access
  const plan: PlanId = (rawPlan === "pro" || rawPlan === "founder") ? rawPlan : "free";
  
  // User has Pro if they have a paid plan OR are trialing
  const hasPro = hasPaidPlan(plan) || (isTrialing && plan === "pro");
  const hasFounder = plan === "founder";
  const features = getPlanFeatures(plan);
  const planInfo = getPlanDisplayInfo(plan);

  const gate = (featureName: string): boolean => {
    // Trialing Pro users have full Pro access
    if (isTrialing && plan === "pro") {
      return canUseFeature("pro", featureName);
    }
    return canUseFeature(plan, featureName);
  };

  return {
    plan,
    hasPro,
    hasFounder,
    isTrialing,
    gate,
    features,
    planInfo,
    loading,
  };
};
