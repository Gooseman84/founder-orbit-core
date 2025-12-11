import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIdeaSessionStore } from "@/store/ideaSessionStore";
import type { BusinessIdeaV6 } from "@/types/businessIdea";
import type { IdeaGenerationMode } from "@/types/idea";

interface GenerateIdeasParams {
  mode?: IdeaGenerationMode;
  focus_area?: string;
}

interface UseFounderIdeasResult {
  ideas: BusinessIdeaV6[];
  isPending: boolean;
  error: unknown;
  currentMode: IdeaGenerationMode | null;
  generate: (params?: GenerateIdeasParams) => Promise<void>;
  clearIdeas: () => void;
}

export const useFounderIdeas = (): UseFounderIdeasResult => {
  const { user } = useAuth();
  
  // Use the session store for persistence across navigation
  const { 
    sessionIdeas, 
    setSessionIdeas, 
    currentMode, 
    setCurrentMode,
    clearSessionIdeas,
    clearSavedTracking,
  } = useIdeaSessionStore();

  const mutation = useMutation({
    mutationFn: async (params: GenerateIdeasParams = {}) => {
      if (!user?.id) {
        throw new Error("You must be logged in to generate ideas");
      }

      const mode = params.mode || "breadth";
      setCurrentMode(mode);

      const { data, error } = await supabase.functions.invoke("generate-founder-ideas", {
        body: {
          user_id: user.id,
          mode,
          focus_area: params.focus_area,
        },
      });

      if (error) throw error;

      const ideasData = (data as { ideas?: BusinessIdeaV6[] } | null)?.ideas ?? [];
      
      // Store in session store for persistence
      setSessionIdeas(ideasData);
      // Clear saved tracking since we have new ideas
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
    currentMode,
    generate: async (params?: GenerateIdeasParams) => {
      await mutation.mutateAsync(params || {});
    },
    clearIdeas,
  };
};

// Re-export types for convenience
export type { IdeaGenerationMode } from "@/types/idea";
export type { BusinessIdeaV6 } from "@/types/businessIdea";
