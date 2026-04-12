import { useState, useCallback } from "react";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";

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
  const [result, setResult] = useState<MarketValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async (params: {
    idea_title: string;
    idea_description: string;
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
      return data;
    } catch (err: any) {
      const message = err?.message || "Market validation failed";
      setError(message);
      return null;
    } finally {
      setIsValidating(false);
    }
  }, []);

  return { result, isValidating, error, validate };
};
