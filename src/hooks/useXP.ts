import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { getXpSummary } from "@/lib/xpEngine";
import { XpSummary } from "@/types/xp";

export function useXP() {
  const { user } = useAuth();
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

  return {
    xpSummary,
    loading,
    error,
    refresh,
  };
}
