import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { FounderBlueprint } from "@/types/blueprint";

interface UseVentureBlueprintResult {
  blueprint: FounderBlueprint | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches the founder blueprint scoped to a specific venture's idea.
 * Falls back to user's general blueprint if idea_id not specified.
 */
export function useVentureBlueprint(ideaId?: string | null): UseVentureBlueprintResult {
  const { user } = useAuth();
  const [blueprint, setBlueprint] = useState<FounderBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBlueprint() {
      if (!user) {
        setBlueprint(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First try to fetch blueprint with matching north_star_idea_id
        if (ideaId) {
          const { data: ideaBlueprint, error: ideaError } = await supabase
            .from("founder_blueprints")
            .select("*")
            .eq("user_id", user.id)
            .eq("north_star_idea_id", ideaId)
            .maybeSingle();

          if (!ideaError && ideaBlueprint) {
            setBlueprint(ideaBlueprint as unknown as FounderBlueprint);
            setLoading(false);
            return;
          }
        }

        // Fall back to user's general blueprint
        const { data, error: fetchError } = await supabase
          .from("founder_blueprints")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        setBlueprint(data as unknown as FounderBlueprint | null);
      } catch (err) {
        console.error("Error fetching venture blueprint:", err);
        setError(err instanceof Error ? err.message : "Failed to load blueprint");
        setBlueprint(null);
      } finally {
        setLoading(false);
      }
    }

    fetchBlueprint();
  }, [user, ideaId]);

  return {
    blueprint,
    loading,
    error,
  };
}
