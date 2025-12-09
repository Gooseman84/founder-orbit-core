import { useSubscription } from "@/hooks/useSubscription";

const FEATURE_MATRIX: Record<string, "free" | "pro" | "founder"> = {
  idea_generation: "free",
  idea_vetting: "free",
  opportunity_score: "pro",
  compare_engine: "pro",
  radar: "pro",
  workspace_unlimited: "pro",
};

interface UseFeatureAccessReturn {
  plan: string;
  hasPro: boolean;
  hasFounder: boolean;
  gate: (featureName: string) => boolean;
}

export const useFeatureAccess = (): UseFeatureAccessReturn => {
  const { plan } = useSubscription();

  const hasPro = plan === "pro" || plan === "founder";
  const hasFounder = plan === "founder";

  // TODO: Re-enable paywall gating when ready for production
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const gate = (_featureName: string): boolean => {
    // Temporarily bypassing all feature gates for development
    return true;
  };

  return {
    plan,
    hasPro,
    hasFounder,
    gate,
  };
};
