import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

type Plan = "free" | "pro" | "founder";

interface SubscriptionData {
  plan: Plan;
  status: string;
}

interface UseSubscriptionReturn {
  plan: Plan;
  status: string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: subscription,
    isLoading,
    error,
  } = useQuery<SubscriptionData>({
    queryKey: ["user-subscription", user?.id],
    queryFn: async (): Promise<SubscriptionData> => {
      if (!user) {
        return { plan: "free", status: "active" };
      }

      try {
        // Use secure RPC function that excludes Stripe IDs
        // Note: Don't use .maybeSingle() on RPC calls as it causes 406 errors when no rows returned
        const { data, error: queryError } = await supabase.rpc(
          "get_user_subscription",
          { p_user_id: user.id }
        );

        if (queryError) {
          console.error("[useSubscription] RPC error:", queryError);
          return { plan: "free", status: "active" };
        }

        // RPC returns an array, take first result
        if (data && Array.isArray(data) && data.length > 0) {
          const sub = data[0] as { plan: string; status: string | null };
          return {
            plan: (sub.plan || "free") as Plan,
            status: sub.status || "active",
          };
        }

        // No subscription found, use defaults
        return { plan: "free", status: "active" };
      } catch (err) {
        console.error("[useSubscription] Unexpected error:", err);
        return { plan: "free", status: "active" };
      }
    },
    enabled: !!user,
    staleTime: 60000, // Cache for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes (gcTime replaces cacheTime in v5)
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnMount: false, // Don't refetch if data exists
    retry: 1, // Only retry once on failure
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["user-subscription", user?.id],
    });
  }, [queryClient, user?.id]);

  return {
    plan: subscription?.plan || "free",
    status: subscription?.status || "active",
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refresh,
  };
};
