import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { BusinessIdea } from "@/types/businessIdea";

interface UseFounderIdeasResult {
  ideas: BusinessIdea[];
  isPending: boolean;
  error: unknown;
  generate: () => Promise<void>;
}

export const useFounderIdeas = (): UseFounderIdeasResult => {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<BusinessIdea[]>([]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("You must be logged in to generate ideas");
      }

      const { data, error } = await supabase.functions.invoke("generate-founder-ideas", {
        body: {},
      });

      if (error) throw error;

      const ideasData = (data as { ideas?: BusinessIdea[] } | null)?.ideas ?? [];
      setIdeas(ideasData);
    },
  });

  return {
    ideas,
    isPending: mutation.isPending,
    error: mutation.error ?? null,
    generate: mutation.mutateAsync,
  };
};
