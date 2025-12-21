import { useState } from "react";
import { useAuth } from "./useAuth";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import type { BusinessIdea } from "@/types/businessIdea";
import type { PlanErrorCode } from "@/config/plans";

interface FitScores {
  overall: number;
  passion: number;
  skill: number;
  constraints: number;
  lifestyle: number;
}

interface SaveResult {
  success: boolean;
  id?: string;  // Database ID from ideas table
  errorCode?: PlanErrorCode;
  limit?: number;
}

export function useSaveFounderIdea() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [planError, setPlanError] = useState<{ code: PlanErrorCode; limit?: number } | null>(null);

  const saveIdea = async (idea: BusinessIdea, fitScores?: FitScores): Promise<SaveResult> => {
    if (!user) {
      setError(new Error("Not authenticated"));
      return { success: false };
    }

    setIsSaving(true);
    setError(null);
    setPlanError(null);

    try {
      const data = await invokeAuthedFunction<any, { id?: string; code?: string; limit?: number; error?: string }>({
        functionName: "save-founder-idea",
        body: { idea, fitScores },
      });
      const invokeError = null;

      // Handle errors including plan limits from 403 responses
      if (invokeError) {
        // Try to parse error context for plan limit info
        const errorContext = (invokeError as any)?.context;
        let parsedError: any = null;
        
        if (errorContext?.body) {
          try {
            parsedError = JSON.parse(errorContext.body);
          } catch {
            // Not JSON, ignore
          }
        }
        
        // Check if this is a plan limit error
        if (parsedError?.code) {
          setPlanError({ code: parsedError.code, limit: parsedError.limit });
          return { success: false, errorCode: parsedError.code, limit: parsedError.limit };
        }
        
        throw new Error(invokeError.message || "Failed to save idea");
      }

      // Check for plan limit errors
      if (data?.code) {
        setPlanError({ code: data.code as PlanErrorCode, limit: data.limit });
        return { success: false, errorCode: data.code as PlanErrorCode, limit: data.limit };
      }

      if (data?.error && !data?.code) {
        throw new Error(data.error);
      }

      return { success: true, id: data?.id };
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Failed to save idea");
      setError(e);
      return { success: false };
    } finally {
      setIsSaving(false);
    }
  };

  const clearPlanError = () => setPlanError(null);

  return { saveIdea, isSaving, error, planError, clearPlanError };
}
