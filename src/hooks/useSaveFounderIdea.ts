import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { BusinessIdea } from "@/types/businessIdea";
import type { PlanErrorCode } from "@/config/plans";

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

  const saveIdea = async (idea: BusinessIdea): Promise<SaveResult> => {
    if (!user) {
      setError(new Error("Not authenticated"));
      return { success: false };
    }

    setIsSaving(true);
    setError(null);
    setPlanError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "save-founder-idea",
        { body: { idea, userId: user.id } }
      );

      if (invokeError) {
        throw new Error(invokeError.message || "Failed to save idea");
      }

      // Check for plan limit errors
      if (data?.code) {
        setPlanError({ code: data.code, limit: data.limit });
        return { success: false, errorCode: data.code, limit: data.limit };
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
