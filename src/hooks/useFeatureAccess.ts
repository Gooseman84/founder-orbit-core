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

  const gate = (featureName: string): boolean => {
    const required = FEATURE_MATRIX[featureName];

    if (!required || required === "free") {
      return true;
    }

    if (required === "pro" && hasPro) {
      return true;
    }

    if (required === "founder" && hasFounder) {
      return true;
    }

    return false;
  };

  return {
    plan,
    hasPro,
    hasFounder,
    gate,
  };
};
