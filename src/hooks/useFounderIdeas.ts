import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
}

export const useFounderIdeas = (): UseFounderIdeasResult => {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<BusinessIdeaV6[]>([]);
  const [currentMode, setCurrentMode] = useState<IdeaGenerationMode | null>(null);

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
      setIdeas(ideasData);
      
      return ideasData;
    },
  });

  return {
    ideas,
    isPending: mutation.isPending,
    error: mutation.error ?? null,
    currentMode,
    generate: async (params?: GenerateIdeasParams) => {
      await mutation.mutateAsync(params || {});
    },
  };
};

// Re-export types for convenience
export type { IdeaGenerationMode } from "@/types/idea";
export type { BusinessIdeaV6 } from "@/types/businessIdea";
