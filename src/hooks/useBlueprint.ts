import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FounderBlueprint } from "@/types/blueprint";

export function useBlueprint() {
  const { user } = useAuth();
  const [blueprint, setBlueprint] = useState<FounderBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlueprint = useCallback(async () => {
    if (!user) {
      setBlueprint(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("founder_blueprints" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      setBlueprint(data as unknown as FounderBlueprint | null);
    } catch (err) {
      console.error("Error fetching blueprint:", err);
      setError(err instanceof Error ? err.message : "Failed to load blueprint");
      setBlueprint(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refresh = useCallback(async () => {
    await fetchBlueprint();
  }, [fetchBlueprint]);

  const saveUpdates = useCallback(
    async (partialData: Partial<Omit<FounderBlueprint, "id" | "user_id" | "created_at">>) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      try {
        setError(null);

        const updatePayload = {
          ...partialData,
          user_id: user.id,
          updated_at: new Date().toISOString(),
        };

        // Use upsert with the unique constraint on user_id
        const { data, error: upsertError } = await supabase
          .from("founder_blueprints" as any)
          .upsert(updatePayload as any, {
            onConflict: "user_id",
          })
          .select()
          .single();

        if (upsertError) {
          throw upsertError;
        }

        setBlueprint(data as unknown as FounderBlueprint);
        return data as unknown as FounderBlueprint;
      } catch (err) {
        console.error("Error saving blueprint:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to save blueprint";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [user]
  );

  useEffect(() => {
    fetchBlueprint();
  }, [fetchBlueprint]);

  return {
    blueprint,
    loading,
    error,
    refresh,
    saveUpdates,
  };
}
