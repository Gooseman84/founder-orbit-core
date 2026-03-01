import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

export interface DimensionScore {
  score: number;
  rationale: string;
}

export interface FinancialViabilityDimensions {
  marketSize: DimensionScore;
  unitEconomics: DimensionScore;
  timeToRevenue: DimensionScore;
  competitiveDensity: DimensionScore;
  capitalRequirements: DimensionScore;
  founderMarketFit: DimensionScore;
}

export interface ScoreEvaluation {
  consistent: boolean;
  confidence: string;
  contradictions: Array<{
    dimensions: string[];
    issue: string;
    severity: string;
  }>;
  adjustmentSuggestions: Array<{
    dimension: string;
    currentScore: number;
    suggestedScore: number;
    reason: string;
  }>;
  evaluatorNote: string;
}

export interface FinancialViabilityScoreData {
  id: string;
  compositeScore: number;
  dimensions?: FinancialViabilityDimensions;
  summary?: string;
  topRisk?: string;
  topOpportunity?: string;
  isPro: boolean;
  createdAt: string;
  scoreEvaluation?: ScoreEvaluation;
}

interface IdeaContext {
  title?: string;
  description?: string;
  targetCustomer?: string;
  revenueModel?: string;
  category?: string;
  platform?: string;
  blueprintData?: Record<string, unknown>;
}

interface UseFinancialViabilityScoreReturn {
  score: FinancialViabilityScoreData | null;
  isLoading: boolean;
  isCalculating: boolean;
  error: string | null;
  calculateScore: (ideaContext: IdeaContext) => Promise<void>;
  hasScore: boolean;
}

export function useFinancialViabilityScore(ideaId: string | undefined): UseFinancialViabilityScoreReturn {
  const { user } = useAuth();
  const { hasPro } = useFeatureAccess();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Fetch existing score from database
  const {
    data: cachedScore,
    isLoading,
  } = useQuery({
    queryKey: ["financial-viability-score", ideaId],
    queryFn: async () => {
      if (!user || !ideaId) return null;

      const { data, error: fetchError } = await supabase
        .from("financial_viability_scores")
        .select("*")
        .eq("user_id", user.id)
        .eq("idea_id", ideaId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error("[useFinancialViabilityScore] Fetch error:", fetchError);
        return null;
      }

      if (!data) return null;

      // Transform database row to interface
      const dimensions = data.dimensions as unknown as FinancialViabilityDimensions | undefined;
      const scoreEvaluation = (data as any).score_evaluation as ScoreEvaluation | undefined;
      
      return {
        id: data.id,
        compositeScore: data.composite_score,
        dimensions: hasPro ? dimensions : undefined,
        summary: data.summary || undefined,
        topRisk: hasPro ? data.top_risk || undefined : undefined,
        topOpportunity: hasPro ? data.top_opportunity || undefined : undefined,
        isPro: hasPro,
        createdAt: data.created_at,
        scoreEvaluation: scoreEvaluation || undefined,
      } as FinancialViabilityScoreData;
    },
    enabled: !!user && !!ideaId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation to calculate new score
  const calculateMutation = useMutation({
    mutationFn: async (ideaContext: IdeaContext) => {
      if (!user || !ideaId) {
        throw new Error("User or idea ID missing");
      }

      const { data, error: calcError } = await invokeAuthedFunction("calculate-financial-viability", {
        body: {
          userId: user.id,
          ideaId,
          ideaContext,
        },
      });

      if (calcError) {
        throw calcError;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["financial-viability-score", ideaId] });
      setError(null);
    },
    onError: (err: Error) => {
      let message = "Failed to calculate viability score";
      
      if (err instanceof AuthSessionMissingError) {
        message = "Session expired. Please sign in again.";
      } else if (err.message?.includes("Rate limit")) {
        message = "Too many requests. Please wait a moment.";
      } else if (err.message?.includes("AI credits")) {
        message = "AI credits exhausted. Please try again later.";
      }
      
      setError(message);
    },
  });

  const calculateScore = useCallback(async (ideaContext: IdeaContext) => {
    setError(null);
    await calculateMutation.mutateAsync(ideaContext);
  }, [calculateMutation]);

  return {
    score: cachedScore || null,
    isLoading,
    isCalculating: calculateMutation.isPending,
    error,
    calculateScore,
    hasScore: !!cachedScore,
  };
}
