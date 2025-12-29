import { useState, useCallback, useEffect } from "react";
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
  isValidCommitmentDraft,
  isValidCommitmentFull,
} from "@/types/venture";

interface UseVentureStateResult {
  // Current active venture (if any)
  activeVenture: Venture | null;
  isLoading: boolean;
  error: Error | null;

  // State checks
  canGenerateTasks: boolean;
  canGenerateExecutionAdvice: boolean;
  canEditIdeaFundamentals: boolean;
  canAccessIdeationTools: boolean;

  // State transition methods
  // For 'committed': pass CommitmentDraft (window + metric)
  // For 'executing': pass CommitmentFull (window + metric + start/end timestamps)
  transitionTo: (
    ventureId: string, 
    targetState: VentureState, 
    commitmentData?: CommitmentDraft | CommitmentFull
  ) => Promise<boolean>;
  
  // Refresh active venture
  refresh: () => Promise<void>;

  // Guard helpers that return error messages
  guardTaskGeneration: () => string | null;
  guardExecutionAdvice: () => string | null;
  guardIdeaEdit: () => string | null;
  guardIdeationAccess: () => string | null;
}

export function useVentureState(): UseVentureStateResult {
  const { user } = useAuth();
  const [activeVenture, setActiveVenture] = useState<Venture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch the user's active venture (if any)
  const refresh = useCallback(async () => {
    if (!user) {
      setActiveVenture(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Find the active venture (committed, executing, or reviewed state)
      const { data, error: fetchError } = await supabase
        .from("ventures")
        .select("*")
        .eq("user_id", user.id)
        .in("venture_state", ["committed", "executing", "reviewed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        // Cast the data to Venture type, handling the venture_state from DB
        setActiveVenture({
          ...data,
          venture_state: data.venture_state as VentureState,
          commitment_window_days: data.commitment_window_days as CommitmentWindowDays | null,
        } as Venture);
      } else {
        setActiveVenture(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch active venture"));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load active venture on mount and when user changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Transition a venture to a new state
  // For 'committed': requires CommitmentDraft (window + metric)
  // For 'executing': requires CommitmentFull (window + metric + timestamps)
  const transitionTo = useCallback(async (
    ventureId: string,
    targetState: VentureState,
    commitmentData?: CommitmentDraft | CommitmentFull
  ): Promise<boolean> => {
    if (!user) {
      setError(new Error("Not authenticated"));
      return false;
    }

    try {
      // First, fetch the current venture to validate transition
      const { data: currentVenture, error: fetchError } = await supabase
        .from("ventures")
        .select("*")
        .eq("id", ventureId)
        .eq("user_id", user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!currentVenture) throw new Error("Venture not found");

      const currentState = currentVenture.venture_state as VentureState;

      // Validate transition is allowed
      if (!canTransitionTo(currentState, targetState)) {
        throw new Error(`Invalid state transition: ${currentState} -> ${targetState}`);
      }

      // Validate commitment data based on target state
      if (targetState === "committed") {
        if (!commitmentData || !isValidCommitmentDraft(commitmentData)) {
          throw new Error("Commitment window and success metric are required to enter committed state");
        }
      }

      if (targetState === "executing") {
        if (!commitmentData || !isValidCommitmentFull(commitmentData)) {
          throw new Error("All commitment fields (window, metric, start/end dates) are required to enter executing state");
        }
      }

      // Build the update payload
      const updateData: Record<string, unknown> = {
        venture_state: targetState,
      };

      // Include commitment data for committed state (window + metric only)
      if (targetState === "committed" && commitmentData) {
        updateData.commitment_window_days = commitmentData.commitment_window_days;
        updateData.success_metric = commitmentData.success_metric;
      }

      // Include full commitment data for executing state
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

      // Refresh to get updated state
      await refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to transition venture state"));
      return false;
    }
  }, [user, refresh]);

  // Compute permissions based on active venture state
  const ventureState = activeVenture?.venture_state ?? "inactive";
  const hasActiveVenture = activeVenture !== null && isActiveVentureState(ventureState);

  const permissions = {
    canGenerateTasks: hasActiveVenture && canGenerateTasks(ventureState),
    canGenerateExecutionAdvice: hasActiveVenture && canGenerateExecutionAdvice(ventureState),
    canEditIdeaFundamentals: !hasActiveVenture || canEditIdeaFundamentals(ventureState),
    canAccessIdeationTools: !hasActiveVenture || canAccessIdeationTools(ventureState),
  };

  // Guard functions that return error messages (null if allowed)
  const guardTaskGeneration = useCallback((): string | null => {
    if (!hasActiveVenture) {
      return "You need to commit to a venture before generating tasks.";
    }
    if (ventureState !== "executing") {
      return `Cannot generate tasks while venture is in "${ventureState}" state. Tasks can only be generated during active execution.`;
    }
    return null;
  }, [hasActiveVenture, ventureState]);

  const guardExecutionAdvice = useCallback((): string | null => {
    if (!hasActiveVenture) {
      return "You need to commit to a venture before getting execution advice.";
    }
    if (ventureState !== "executing") {
      return `Cannot get execution advice while venture is in "${ventureState}" state. Advice is only available during active execution.`;
    }
    return null;
  }, [hasActiveVenture, ventureState]);

  const guardIdeaEdit = useCallback((): string | null => {
    if (hasActiveVenture && !canEditIdeaFundamentals(ventureState)) {
      return `Cannot edit idea fundamentals while venture is in "${ventureState}" state. Complete or kill your current venture first.`;
    }
    return null;
  }, [hasActiveVenture, ventureState]);

  const guardIdeationAccess = useCallback((): string | null => {
    if (hasActiveVenture && !canAccessIdeationTools(ventureState)) {
      return "Ideation tools are locked while you're actively executing a venture. Focus on your current commitment.";
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
