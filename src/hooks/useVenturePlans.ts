import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { VenturePlan } from "@/types/venture";

interface UseVenturePlansResult {
  plans: VenturePlan[];
  latestPlan: VenturePlan | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useVenturePlans(ventureId: string | null): UseVenturePlansResult {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["venture-plans", user?.id, ventureId],
    queryFn: async () => {
      if (!user || !ventureId) return [];

      const { data, error } = await supabase
        .from("venture_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("venture_id", ventureId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as VenturePlan[];
    },
    enabled: !!user && !!ventureId,
  });

  const plans = data || [];
  const latestPlan = plans.length > 0 ? plans[0] : null;

  return {
    plans,
    latestPlan,
    isLoading,
    error: error instanceof Error ? error : null,
    refetch,
  };
}
