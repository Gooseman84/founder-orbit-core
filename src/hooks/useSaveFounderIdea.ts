import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessIdea } from "@/types/businessIdea";

export function useSaveFounderIdea() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveIdea = async (idea: BusinessIdea): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "save-founder-idea",
        { body: { idea } }
      );

      if (invokeError) {
        throw new Error(invokeError.message || "Failed to save idea");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return true;
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Failed to save idea");
      setError(e);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { saveIdea, isSaving, error };
}
