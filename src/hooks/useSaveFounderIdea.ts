import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { BusinessIdea } from "@/types/businessIdea";

interface SaveResult {
  success: boolean;
  id?: string;  // Database ID from ideas table
}

export function useSaveFounderIdea() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveIdea = async (idea: BusinessIdea): Promise<SaveResult> => {
    if (!user) {
      setError(new Error("Not authenticated"));
      return { success: false };
    }

    setIsSaving(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "save-founder-idea",
        { body: { idea, userId: user.id } }
      );

      if (invokeError) {
        throw new Error(invokeError.message || "Failed to save idea");
      }

      if (data?.error) {
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

  return { saveIdea, isSaving, error };
}
