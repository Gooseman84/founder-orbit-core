import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Plan = "free" | "pro" | "founder";

interface UseSubscriptionReturn {
  plan: Plan;
  status: string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>("free");
  const [status, setStatus] = useState<string>("active");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    if (!user) {
      setPlan("free");
      setStatus("active");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use secure RPC function that excludes Stripe IDs
      // Note: Don't use .maybeSingle() on RPC calls as it causes 406 errors when no rows returned
      const { data, error: queryError } = await supabase
        .rpc("get_user_subscription", { p_user_id: user.id });

      if (queryError) {
        console.error("Error loading subscription:", queryError);
        setError(queryError.message);
        setPlan("free");
        setStatus("active");
      } else if (data && Array.isArray(data) && data.length > 0) {
        // RPC returns an array, take first result
        const subscription = data[0] as { plan: string; status: string | null };
        setPlan((subscription.plan || "free") as Plan);
        setStatus(subscription.status || "active");
      } else {
        // No subscription found, use defaults
        setPlan("free");
        setStatus("active");
      }
    } catch (err) {
      console.error("Error in loadSubscription:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setPlan("free");
      setStatus("active");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const refresh = useCallback(async () => {
    await loadSubscription();
  }, [loadSubscription]);

  return {
    plan,
    status,
    loading,
    error,
    refresh,
  };
};
