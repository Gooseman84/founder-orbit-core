import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIdeaSessionStore } from "@/store/ideaSessionStore";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import type { BusinessIdeaV6, GenerationTone } from "@/types/businessIdea";
import type { IdeaGenerationMode } from "@/types/idea";
import type { PlanErrorCode } from "@/config/plans";

interface GenerateIdeasParams {
  mode?: IdeaGenerationMode;
  focus_area?: string;
  tone?: GenerationTone;
}

interface PlanLimitError {
  code: PlanErrorCode;
  mode?: string;
  limit?: number;
  plan?: string;
}

interface RetryableError {
  message: string;
  retryable: boolean;
}

interface UseFounderIdeasResult {
  ideas: BusinessIdeaV6[];
  isPending: boolean;
  error: unknown;
  planError: PlanLimitError | null;
  retryableError: RetryableError | null;
  currentMode: IdeaGenerationMode | null;
  currentTone: GenerationTone;
  // v7 two-pass data
  rawIdeasCount: number;
  generationVersion: string | null;
  generate: (params?: GenerateIdeasParams) => Promise<void>;
  clearIdeas: () => void;
  clearPlanError: () => void;
}

export const useFounderIdeas = (): UseFounderIdeasResult => {
  const { user } = useAuth();
  const [retryableError, setRetryableError] = useState<RetryableError | null>(null);
  
  const { 
    sessionIdeas, 
    setSessionIdeas, 
    currentMode, 
    setCurrentMode,
    currentTone,
    setCurrentTone,
    clearSessionIdeas,
    clearSavedTracking,
    planError,
    setPlanError,
    clearPlanError,
    rawIdeas,
    setTwoPassData,
    generationVersion,
  } = useIdeaSessionStore();

  const mutation = useMutation({
    mutationFn: async (params: GenerateIdeasParams = {}) => {
      if (!user?.id) {
        throw new Error("You must be logged in to generate ideas");
      }

      const mode = params.mode || "breadth";
      const tone = params.tone || "exciting";
      
      setCurrentMode(mode);
      setCurrentTone(tone);
      clearPlanError();
      setRetryableError(null);

      const { data, error } = await invokeAuthedFunction<{
        ideas?: BusinessIdeaV6[];
        code?: string;
        mode?: string;
        limit?: number;
        plan?: string;
        error?: string;
        retryable?: boolean;
        generation_version?: string;
        pass_a_raw_ideas?: any[];
        final_ranked_ideas?: any[];
      }>(
        "generate-founder-ideas",
        {
          body: {
            mode,
            focus_area: params.focus_area,
            tone,
          },
        }
      );

      // Handle errors - supabase.functions.invoke returns error for non-2xx
      if (error) {
        // Try to parse error context for plan limit info or retryable errors
        // The edge function returns JSON body even on 403/500
        const errorContext = (error as any)?.context;
        let parsedError: any = null;
        
        if (errorContext?.body) {
          try {
            parsedError = JSON.parse(errorContext.body);
          } catch {
            // Not JSON, ignore
          }
        }
        
        // Check if this is a retryable error (truncated AI response)
        if (parsedError?.retryable === true) {
          setRetryableError({
            message: parsedError.error || "The AI response was incomplete. Please try again.",
            retryable: true,
          });
          throw new Error(parsedError.error || "AI response truncated");
        }
        
        // Check if this is a plan limit error
        if (parsedError?.code) {
          const planErr: PlanLimitError = {
            code: parsedError.code,
            mode: parsedError.mode,
            limit: parsedError.limit,
            plan: parsedError.plan,
          };
          setPlanError(planErr);
          throw new Error(parsedError.error || "Plan limit reached");
        }
        
        throw error;
      }

      // Also check for plan limit errors in successful response (legacy pattern)
      if (data?.code) {
        const planErr: PlanLimitError = {
          code: data.code as PlanErrorCode,
          mode: data.mode,
          limit: data.limit,
          plan: data.plan,
        };
        setPlanError(planErr);
        throw new Error(data.error || "Plan limit reached");
      }

      // Handle v7 two-pass response
      if (data?.generation_version === "v6.1+v2.0") {
        const rawIdeas = data.pass_a_raw_ideas || [];
        const refinedIdeas = data.final_ranked_ideas || [];
        setTwoPassData(rawIdeas, refinedIdeas, data.generation_version);
        console.log(`v7 generation: ${rawIdeas.length} raw ideas → ${refinedIdeas.length} refined`);
      }

      const ideasData = data?.ideas ?? [];
      
      // Store in session store
      setSessionIdeas(ideasData);
      clearSavedTracking();
      
      return ideasData;
    },
  });

  const clearIdeas = () => {
    clearSessionIdeas();
    setCurrentMode(null);
  };

  return {
    ideas: sessionIdeas,
    isPending: mutation.isPending,
    error: mutation.error ?? null,
    planError,
    retryableError,
    currentMode,
    currentTone,
    rawIdeasCount: rawIdeas.length,
    generationVersion,
    generate: async (params?: GenerateIdeasParams) => {
      await mutation.mutateAsync(params || {});
    },
    clearIdeas,
    clearPlanError,
  };
};

// Re-export types
export type { IdeaGenerationMode } from "@/types/idea";
export type { BusinessIdeaV6, GenerationTone } from "@/types/businessIdea";
