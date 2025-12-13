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

      // Use secure view that excludes Stripe IDs
      const { data, error: queryError } = await supabase
        .from("user_subscription_info")
        .select("*")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (queryError) {
        console.error("Error loading subscription:", queryError);
        setError(queryError.message);
        setPlan("free");
        setStatus("active");
      } else if (data) {
        setPlan(data.plan as Plan);
        setStatus(data.status || "active");
      } else {
        // No row found, keep defaults
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
