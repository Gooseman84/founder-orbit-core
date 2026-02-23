import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";
import type { PlanId } from "@/config/plans";
import { TRIAL_DURATION_DAYS } from "@/config/plans";

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

// Helper to normalize plan values (handles "free" from old data)
function normalizePlan(rawPlan: string | null | undefined): PlanId {
  if (rawPlan === "pro" || rawPlan === "founder") {
    return rawPlan;
  }
  // "free" or null/undefined maps to "trial"
  return "trial";
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
        return { plan: "trial", status: "active", currentPeriodEnd: null, cancelAt: null, renewalPeriod: null, trialEnd: null };
      }

      try {
        // Use secure RPC function that excludes Stripe IDs
        const { data, error: queryError } = await supabase.rpc(
          "get_user_subscription",
          { p_user_id: user.id }
        );

        if (queryError) {
          console.error("[useSubscription] RPC error:", queryError);
          return { plan: "trial", status: "active", currentPeriodEnd: null, cancelAt: null, renewalPeriod: null, trialEnd: null };
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
        return { plan: "trial", status: "active", currentPeriodEnd: null, cancelAt: null, renewalPeriod: null, trialEnd: null };
      } catch (err) {
        console.error("[useSubscription] Unexpected error:", err);
        return { plan: "trial", status: "active", currentPeriodEnd: null, cancelAt: null, renewalPeriod: null, trialEnd: null };
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

  // Determine if user has an active paid plan
  const plan = subscription?.plan || "trial";
  const status = subscription?.status || "active";
  const hasPaidSubscription = (plan === "pro" || plan === "founder") && (status === "active" || status === "trialing");

  // Stripe-managed trial: plan=pro, status=trialing
  const isStripeTrialing = plan === "pro" && status === "trialing";
  // App-side trial: plan=trial (no Stripe subscription)
  const isAppTrialing = plan === "trial" && !hasPaidSubscription;
  const isTrialing = isStripeTrialing || isAppTrialing;

  let daysUntilTrialEnd: number | null = null;
  let isTrialExpired = false;

  if (isStripeTrialing && subscription?.trialEnd) {
    // Stripe-managed trial — compute from trial_end
    const trialEnd = new Date(subscription.trialEnd);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    daysUntilTrialEnd = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysUntilTrialEnd < 0) daysUntilTrialEnd = 0;
    isTrialExpired = false; // Can't expire while Stripe says "trialing"
  } else if (isAppTrialing) {
    // App-side fallback for users without Stripe subscription
    const userCreatedAt = user?.created_at ? new Date(user.created_at) : null;
    const trialEndDate = userCreatedAt 
      ? new Date(userCreatedAt.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000)
      : null;
    
    if (trialEndDate) {
      const now = new Date();
      const diffTime = trialEndDate.getTime() - now.getTime();
      daysUntilTrialEnd = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysUntilTrialEnd < 0) daysUntilTrialEnd = 0;
      isTrialExpired = daysUntilTrialEnd <= 0;
    }
  }

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
