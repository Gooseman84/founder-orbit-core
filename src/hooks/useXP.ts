import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { getXpSummary } from "@/lib/xpEngine";
import { XpSummary } from "@/types/xp";
import { useQueryClient } from "@tanstack/react-query";

export function useXP() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [xpSummary, setXpSummary] = useState<XpSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchXpSummary = useCallback(async () => {
    if (!user) {
      setXpSummary(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const summary = await getXpSummary(user.id);
      setXpSummary(summary);
    } catch (err) {
      console.error("Error fetching XP summary:", err);
      setError(err instanceof Error ? err.message : "Failed to load XP data");
      setXpSummary(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refresh = useCallback(async () => {
    await fetchXpSummary();
  }, [fetchXpSummary]);

  useEffect(() => {
    fetchXpSummary();
  }, [fetchXpSummary]);

  // Listen for XP query invalidations from other hooks
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] === "xp" && event?.query.queryKey[1] === user.id) {
        fetchXpSummary();
      }
    });

    return () => unsubscribe();
  }, [user, queryClient, fetchXpSummary]);

  return {
    xpSummary,
    loading,
    error,
    refresh,
  };
}
