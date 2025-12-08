import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { VenturePlan, VenturePlanType } from "@/types/venture";

interface GenerateOptions {
  planType?: VenturePlanType;
  startDate?: string;
}

interface GenerateResult {
  plan: VenturePlan;
  tasksCreated: string[];
}

interface UseGenerateVenturePlanResult {
  generate: (ventureId: string, opts?: GenerateOptions) => Promise<GenerateResult | null>;
  isPending: boolean;
  error: Error | null;
}

export function useGenerateVenturePlan(): UseGenerateVenturePlanResult {
  const { user } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(async (
    ventureId: string,
    opts?: GenerateOptions
  ): Promise<GenerateResult | null> => {
    if (!user) {
      setError(new Error("Not authenticated"));
      return null;
    }

    setIsPending(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        "generate-venture-plan",
        {
          body: {
            ventureId,
            planType: opts?.planType ?? "30_day",
            startDate: opts?.startDate,
          },
        }
      );

      if (functionError) {
        throw new Error(functionError.message || "Failed to generate venture plan");
      }

      if (!data) {
        throw new Error("No data returned from function");
      }

      return {
        plan: data.plan,
        tasksCreated: data.tasksCreated || [],
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to generate venture plan");
      setError(error);
      return null;
    } finally {
      setIsPending(false);
    }
  }, [user]);

  return {
    generate,
    isPending,
    error,
  };
}
