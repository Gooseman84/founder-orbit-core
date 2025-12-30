import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Venture } from "@/types/venture";

interface NorthStarData {
  ideaId: string | null;
  ideaTitle: string | null;
  venture: Venture | null;
}

interface UseNorthStarVentureResult {
  northStarIdeaId: string | null;
  northStarIdeaTitle: string | null;
  northStarVenture: Venture | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch the user's North Star idea and its associated venture (any state).
 * This is used by SidebarNav to build the Blueprint link with the correct ventureId.
 */
export function useNorthStarVenture(): UseNorthStarVentureResult {
  const { user } = useAuth();
  const [data, setData] = useState<NorthStarData>({
    ideaId: null,
    ideaTitle: null,
    venture: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setData({ ideaId: null, ideaTitle: null, venture: null });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Fetch the North Star idea (status = 'north_star')
      const { data: northStarIdea, error: ideaError } = await supabase
        .from("ideas")
        .select("id, title")
        .eq("user_id", user.id)
        .eq("status", "north_star")
        .maybeSingle();

      if (ideaError) throw ideaError;

      if (!northStarIdea) {
        setData({ ideaId: null, ideaTitle: null, venture: null });
        setIsLoading(false);
        return;
      }

      // Step 2: Fetch the venture for this idea (any state)
      const { data: venture, error: ventureError } = await supabase
        .from("ventures")
        .select("*")
        .eq("user_id", user.id)
        .eq("idea_id", northStarIdea.id)
        .eq("status", "active") // active means not deleted
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ventureError) throw ventureError;

      setData({
        ideaId: northStarIdea.id,
        ideaTitle: northStarIdea.title,
        venture: venture as Venture | null,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch North Star venture"));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    northStarIdeaId: data.ideaId,
    northStarIdeaTitle: data.ideaTitle,
    northStarVenture: data.venture,
    isLoading,
    error,
    refresh,
  };
}
