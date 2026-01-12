import { useState, useEffect, useRef } from "react";
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
  
  // Track current fetch to prevent race conditions
  const fetchIdRef = useRef(0);

  useEffect(() => {
    // Increment fetch ID to invalidate any in-flight requests
    const currentFetchId = ++fetchIdRef.current;
    
    // Reset state when dependencies change to prevent stale data
    setBlueprint(null);
    setError(null);
    
    async function fetchBlueprint() {
      // Early exit if no user
      if (!user) {
        setBlueprint(null);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let fetchedBlueprint: FounderBlueprint | null = null;

        // First try to fetch blueprint with matching north_star_idea_id
        if (ideaId) {
          const { data: ideaBlueprint, error: ideaError } = await supabase
            .from("founder_blueprints")
            .select("*")
            .eq("user_id", user.id)
            .eq("north_star_idea_id", ideaId)
            .maybeSingle();

          // Check if this fetch is still current
          if (currentFetchId !== fetchIdRef.current) return;

          if (ideaError) {
            console.warn("Error fetching idea-specific blueprint:", ideaError.message);
            // Continue to fallback instead of throwing
          } else if (ideaBlueprint) {
            fetchedBlueprint = ideaBlueprint as unknown as FounderBlueprint;
          }
        }

        // Fall back to user's most recent blueprint if no idea-specific one found
        if (!fetchedBlueprint) {
          const { data, error: fetchError } = await supabase
            .from("founder_blueprints")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Check if this fetch is still current
          if (currentFetchId !== fetchIdRef.current) return;

          if (fetchError) {
            throw fetchError;
          }

          fetchedBlueprint = data as unknown as FounderBlueprint | null;
        }

        setBlueprint(fetchedBlueprint);
      } catch (err) {
        // Only update state if this fetch is still current
        if (currentFetchId !== fetchIdRef.current) return;
        
        console.error("Error fetching venture blueprint:", err);
        setError(err instanceof Error ? err.message : "Failed to load blueprint");
        setBlueprint(null);
      } finally {
        // Only update loading state if this fetch is still current
        if (currentFetchId === fetchIdRef.current) {
          setLoading(false);
        }
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
