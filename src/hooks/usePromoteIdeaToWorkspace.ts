import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessIdea } from "@/types/businessIdea";

interface PromoteResult {
  documentId: string;
  taskIds: string[];
}

export function usePromoteIdeaToWorkspace() {
  const [isPromoting, setIsPromoting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const promote = async (idea: BusinessIdea, createTasks = true): Promise<PromoteResult | null> => {
    setIsPromoting(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "promote-idea-to-workspace",
        {
          body: { idea, createTasks },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || "Failed to promote idea");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return {
        documentId: data.documentId,
        taskIds: data.taskIds || [],
      };
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Unknown error");
      setError(e);
      console.error("Error promoting idea to workspace:", e);
      return null;
    } finally {
      setIsPromoting(false);
    }
  };

  return {
    promote,
    isPromoting,
    error,
  };
}
