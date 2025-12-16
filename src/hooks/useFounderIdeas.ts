import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIdeaSessionStore } from "@/store/ideaSessionStore";
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

interface UseFounderIdeasResult {
  ideas: BusinessIdeaV6[];
  isPending: boolean;
  error: unknown;
  planError: PlanLimitError | null;
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

      const { data, error } = await supabase.functions.invoke("generate-founder-ideas", {
        body: {
          user_id: user.id,
          mode,
          focus_area: params.focus_area,
          tone,
        },
      });

      if (error) throw error;

      // Check for plan limit errors
      if (data?.code) {
        const planErr: PlanLimitError = {
          code: data.code,
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

      const ideasData = (data as { ideas?: BusinessIdeaV6[] } | null)?.ideas ?? [];
      
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
