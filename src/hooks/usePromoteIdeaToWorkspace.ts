import { useState } from "react";
import { useAuth } from "./useAuth";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import type { BusinessIdea } from "@/types/businessIdea";

interface PromoteResult {
  documentId: string;
  taskIds: string[];
}

export function usePromoteIdeaToWorkspace() {
  const { user } = useAuth();
  const [isPromoting, setIsPromoting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const promote = async (idea: BusinessIdea, createTasks = true): Promise<PromoteResult | null> => {
    if (!user) {
      setError(new Error("Not authenticated"));
      return null;
    }

    setIsPromoting(true);
    setError(null);

    try {
      const data = await invokeAuthedFunction<any, { documentId: string; taskIds?: string[]; error?: string }>({
        functionName: "promote-idea-to-workspace",
        body: { idea, createTasks },
      });

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
