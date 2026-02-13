import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { 
  Venture, 
  VentureState, 
  CommitmentWindowDays,
  CommitmentDraft,
  CommitmentFull,
} from "@/types/venture";
import {
  canTransitionTo,
  isActiveVentureState,
  canGenerateTasks,
  canGenerateExecutionAdvice,
  canEditIdeaFundamentals,
  canAccessIdeationTools,
  isValidCommitmentFull,
} from "@/types/venture";

export const VENTURE_STATE_QUERY_KEY = "venture-state";

interface UseVentureStateResult {
  activeVenture: Venture | null;
  isLoading: boolean;
  error: Error | null;

  canGenerateTasks: boolean;
  canGenerateExecutionAdvice: boolean;
  canEditIdeaFundamentals: boolean;
  canAccessIdeationTools: boolean;

  transitionTo: (
    ventureId: string, 
    targetState: VentureState, 
    commitmentData?: CommitmentDraft | CommitmentFull
  ) => Promise<boolean>;
  
  refresh: () => Promise<void>;

  guardTaskGeneration: () => string | null;
  guardExecutionAdvice: () => string | null;
  guardIdeaEdit: () => string | null;
  guardIdeationAccess: () => string | null;
}

async function fetchActiveVenture(userId: string): Promise<Venture | null> {
  const { data, error } = await supabase
    .from("ventures")
    .select("*")
    .eq("user_id", userId)
    .in("venture_state", ["executing", "reviewed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    return {
      ...data,
      venture_state: data.venture_state as VentureState,
      commitment_window_days: data.commitment_window_days as CommitmentWindowDays | null,
    } as Venture;
  }
  return null;
}

export function useVentureState(): UseVentureStateResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: activeVenture = null, isLoading, error: queryError } = useQuery({
    queryKey: [VENTURE_STATE_QUERY_KEY, user?.id],
    queryFn: () => fetchActiveVenture(user!.id),
    enabled: !!user,
    staleTime: 10_000,
  });

  const error = queryError as Error | null;

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: [VENTURE_STATE_QUERY_KEY] });
  }, [queryClient]);

  const transitionTo = useCallback(async (
    ventureId: string,
    targetState: VentureState,
    commitmentData?: CommitmentDraft | CommitmentFull
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data: currentVenture, error: fetchError } = await supabase
        .from("ventures")
        .select("*")
        .eq("id", ventureId)
        .eq("user_id", user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!currentVenture) throw new Error("Venture not found");

      const currentState = currentVenture.venture_state as VentureState;

      if (!canTransitionTo(currentState, targetState)) {
        throw new Error(`Invalid state transition: ${currentState} -> ${targetState}`);
      }

      if (targetState === "executing") {
        if (!commitmentData || !isValidCommitmentFull(commitmentData)) {
          throw new Error("All commitment fields (window, metric, start/end dates) are required to enter executing state");
        }
      }

      const updateData: Record<string, unknown> = {
        venture_state: targetState,
      };

      if (targetState === "executing" && commitmentData && isValidCommitmentFull(commitmentData)) {
        updateData.commitment_window_days = commitmentData.commitment_window_days;
        updateData.commitment_start_at = commitmentData.commitment_start_at;
        updateData.commitment_end_at = commitmentData.commitment_end_at;
        updateData.success_metric = commitmentData.success_metric;
      }

      const { error: updateError } = await supabase
        .from("ventures")
        .update(updateData)
        .eq("id", ventureId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      await refresh();
      return true;
    } catch (err) {
      console.error("[useVentureState] transitionTo error:", err);
      throw err;
    }
  }, [user, refresh]);

  // Compute permissions
  const ventureState = activeVenture?.venture_state ?? "inactive";
  const hasActiveVenture = activeVenture !== null && isActiveVentureState(ventureState);

  const permissions = {
    canGenerateTasks: hasActiveVenture && canGenerateTasks(ventureState),
    canGenerateExecutionAdvice: hasActiveVenture && canGenerateExecutionAdvice(ventureState),
    canEditIdeaFundamentals: !hasActiveVenture || canEditIdeaFundamentals(ventureState),
    canAccessIdeationTools: !hasActiveVenture || canAccessIdeationTools(ventureState),
  };

  const guardTaskGeneration = useCallback((): string | null => {
    if (!hasActiveVenture) return "You need to commit to a venture before generating tasks.";
    if (ventureState !== "executing") return `Cannot generate tasks while venture is in "${ventureState}" state.`;
    return null;
  }, [hasActiveVenture, ventureState]);

  const guardExecutionAdvice = useCallback((): string | null => {
    if (!hasActiveVenture) return "You need to commit to a venture before getting execution advice.";
    if (ventureState !== "executing") return `Cannot get execution advice while venture is in "${ventureState}" state.`;
    return null;
  }, [hasActiveVenture, ventureState]);

  const guardIdeaEdit = useCallback((): string | null => {
    if (hasActiveVenture && !canEditIdeaFundamentals(ventureState)) {
      return `Cannot edit idea fundamentals while venture is in "${ventureState}" state.`;
    }
    return null;
  }, [hasActiveVenture, ventureState]);

  const guardIdeationAccess = useCallback((): string | null => {
    if (hasActiveVenture && !canAccessIdeationTools(ventureState)) {
      return "Ideation tools are locked while you're actively executing a venture.";
    }
    return null;
  }, [hasActiveVenture, ventureState]);

  return {
    activeVenture,
    isLoading,
    error,
    ...permissions,
    transitionTo,
    refresh,
    guardTaskGeneration,
    guardExecutionAdvice,
    guardIdeaEdit,
    guardIdeationAccess,
  };
}