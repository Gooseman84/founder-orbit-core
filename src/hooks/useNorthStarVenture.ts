import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Venture } from "@/types/venture";

export const NORTH_STAR_VENTURE_QUERY_KEY = "north-star-venture";

interface NorthStarData {
  ideaId: string | null;
  ideaTitle: string | null;
  venture: Venture | null;
  blueprintNorthStarId: string | null; // For drift detection
}

interface UseNorthStarVentureResult {
  northStarIdeaId: string | null;
  northStarIdeaTitle: string | null;
  northStarVenture: Venture | null;
  blueprintNorthStarId: string | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  /** Returns true if data drift is detected (idea has no venture, or blueprint out of sync) */
  needsRepair: boolean;
}

async function fetchNorthStarData(userId: string): Promise<NorthStarData> {
  // Step 1: Fetch the North Star idea (status = 'north_star')
  const { data: northStarIdea, error: ideaError } = await supabase
    .from("ideas")
    .select("id, title")
    .eq("user_id", userId)
    .eq("status", "north_star")
    .maybeSingle();

  if (ideaError) throw ideaError;

  if (!northStarIdea) {
    return { ideaId: null, ideaTitle: null, venture: null, blueprintNorthStarId: null };
  }

  // Step 2: Fetch the venture for this idea (any state) and blueprint in parallel
  const [ventureResult, blueprintResult] = await Promise.all([
    supabase
      .from("ventures")
      .select("*")
      .eq("user_id", userId)
      .eq("idea_id", northStarIdea.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("founder_blueprints")
      .select("north_star_idea_id")
      .eq("user_id", userId)
      .maybeSingle()
  ]);

  if (ventureResult.error) throw ventureResult.error;
  // Blueprint error is non-fatal

  return {
    ideaId: northStarIdea.id,
    ideaTitle: northStarIdea.title,
    venture: ventureResult.data as Venture | null,
    blueprintNorthStarId: blueprintResult.data?.north_star_idea_id ?? null,
  };
}

/**
 * Hook to fetch the user's North Star idea and its associated venture (any state).
 * This is used by SidebarNav to build the Blueprint link with the correct ventureId.
 * Uses React Query for proper cache invalidation.
 */
export function useNorthStarVenture(): UseNorthStarVentureResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [NORTH_STAR_VENTURE_QUERY_KEY, user?.id],
    queryFn: () => fetchNorthStarData(user!.id),
    enabled: !!user,
    staleTime: 30_000, // 30 seconds
  });

  const refresh = async () => {
    await refetch();
  };

  // Detect drift: idea exists but no venture, OR blueprint doesn't match
  const needsRepair = !!(
    data?.ideaId && 
    (!data.venture || data.blueprintNorthStarId !== data.ideaId)
  );

  return {
    northStarIdeaId: data?.ideaId ?? null,
    northStarIdeaTitle: data?.ideaTitle ?? null,
    northStarVenture: data?.venture ?? null,
    blueprintNorthStarId: data?.blueprintNorthStarId ?? null,
    isLoading,
    error: error as Error | null,
    refresh,
    needsRepair,
  };
}
