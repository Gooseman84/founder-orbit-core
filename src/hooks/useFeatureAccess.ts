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
  gate: (featureName: string) => boolean;
  features: PlanFeatures;
  planInfo: ReturnType<typeof getPlanDisplayInfo>;
  loading: boolean;
}

export const useFeatureAccess = (): UseFeatureAccessReturn => {
  const { plan: rawPlan, loading } = useSubscription();
  
  // Normalize plan to valid PlanId
  const plan: PlanId = (rawPlan === "pro" || rawPlan === "founder") ? rawPlan : "free";
  
  const hasPro = hasPaidPlan(plan);
  const hasFounder = plan === "founder";
  const features = getPlanFeatures(plan);
  const planInfo = getPlanDisplayInfo(plan);

  const gate = (featureName: string): boolean => {
    return canUseFeature(plan, featureName);
  };

  return {
    plan,
    hasPro,
    hasFounder,
    gate,
    features,
    planInfo,
    loading,
  };
};
