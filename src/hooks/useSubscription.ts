import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";
import type { PlanId } from "@/config/plans";

interface SubscriptionData {
  plan: PlanId;
  status: string;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  renewalPeriod: string | null;
  trialEnd: string | null;
}

interface UseSubscriptionReturn {
  plan: PlanId;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAt: Date | null;
  renewalPeriod: string | null;
  isTrialing: boolean;
  isStripeTrialing: boolean;
  isTrialExpired: boolean;
  daysUntilTrialEnd: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Helper to normalize plan values (handles "free"/"trial" from old data)
function normalizePlan(rawPlan: string | null | undefined): PlanId {
  if (rawPlan === "pro" || rawPlan === "founder") {
    return rawPlan;
  }
  // "trial", "free", or null/undefined maps to "free"
  return "free";
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
        return { plan: "free", status: "active", currentPeriodEnd: null, cancelAt: null, renewalPeriod: null, trialEnd: null };
      }

      try {
        // Use secure RPC function that excludes Stripe IDs
        const { data, error: queryError } = await supabase.rpc(
          "get_user_subscription",
          { p_user_id: user.id }
        );

        if (queryError) {
          console.error("[useSubscription] RPC error:", queryError);
          return { plan: "free", status: "active", currentPeriodEnd: null, cancelAt: null, renewalPeriod: null, trialEnd: null };
        }

        // RPC returns an array, take first result
        if (data && Array.isArray(data) && data.length > 0) {
          const sub = data[0] as { 
            plan: string; 
            status: string | null; 
            current_period_end: string | null;
            cancel_at: string | null;
            renewal_period: string | null;
            trial_end: string | null;
          };
          return {
            plan: normalizePlan(sub.plan),
            status: sub.status || "active",
            currentPeriodEnd: sub.current_period_end || null,
            cancelAt: sub.cancel_at || null,
            renewalPeriod: sub.renewal_period || null,
            trialEnd: sub.trial_end || null,
          };
        }

        // No subscription found, use defaults
        return { plan: "free", status: "active", currentPeriodEnd: null, cancelAt: null, renewalPeriod: null, trialEnd: null };
      } catch (err) {
        console.error("[useSubscription] Unexpected error:", err);
        return { plan: "free", status: "active", currentPeriodEnd: null, cancelAt: null, renewalPeriod: null, trialEnd: null };
      }
    },
    enabled: !!user,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["user-subscription", user?.id],
    });
  }, [queryClient, user?.id]);

  const plan = subscription?.plan || "free";
  const status = subscription?.status || "active";

  // Stripe-managed trial: plan=pro, status=trialing
  const isStripeTrialing = plan === "pro" && status === "trialing";

  // No app-side trial anymore — isTrialing only reflects Stripe state
  const isTrialing = false;
  const isTrialExpired = false;
  const daysUntilTrialEnd: number | null = null;

  // Stripe-based period end (for paid subscriptions)
  const currentPeriodEnd = subscription?.currentPeriodEnd 
    ? new Date(subscription.currentPeriodEnd) 
    : null;
  const cancelAt = subscription?.cancelAt 
    ? new Date(subscription.cancelAt) 
    : null;

  return {
    plan,
    status,
    currentPeriodEnd,
    cancelAt,
    renewalPeriod: subscription?.renewalPeriod || null,
    isTrialing,
    isStripeTrialing,
    isTrialExpired,
    daysUntilTrialEnd,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refresh,
  };
};
