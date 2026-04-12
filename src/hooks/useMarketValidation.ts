import { useState, useCallback } from "react";
import { useAuth } from "./useAuth";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { supabase } from "@/integrations/supabase/client";

export interface DemandSignal {
  source: string;
  quote: string;
  relevance: string;
}

export interface Competitor {
  name: string;
  what_they_do: string;
  weakness: string;
  pricing: string;
}

export interface MarketValidationResult {
  demand_signals: DemandSignal[];
  competitor_landscape: Competitor[];
  market_timing: "growing" | "stable" | "declining";
  validation_score: number;
  reality_check: string;
  sources: string[];
}

export const useMarketValidation = () => {
  const { user } = useAuth();
  const [result, setResult] = useState<MarketValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async (params: {
    idea_title: string;
    idea_description: string;
    idea_id?: string;
    target_customer?: string;
    founder_domain?: string;
  }) => {
    setIsValidating(true);
    setError(null);

    try {
      const { data, error: fnError } = await invokeAuthedFunction<MarketValidationResult>(
        "validate-market-signal",
        { body: params }
      );

      if (fnError) throw fnError;
      if (!data) throw new Error("No data returned");

      setResult(data);

      // Persist to market_validations table for the feedback loop
      if (user?.id && params.idea_id) {
        supabase
          .from("market_validations")
          .insert({
            user_id: user.id,
            idea_id: params.idea_id,
            validation_score: data.validation_score,
            demand_signals: data.demand_signals as any,
            competitor_landscape: data.competitor_landscape as any,
            market_timing: data.market_timing,
            raw_response: data as any,
          })
          .then(({ error: dbErr }) => {
            if (dbErr) console.warn("Failed to persist market validation:", dbErr);
          });
      }

      return data;
    } catch (err: any) {
      const message = err?.message || "Market validation failed";
      setError(message);
      return null;
    } finally {
      setIsValidating(false);
    }
  }, [user]);

  return { result, isValidating, error, validate };
};
