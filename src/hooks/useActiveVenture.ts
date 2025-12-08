import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Venture } from "@/types/venture";

interface UseActiveVentureResult {
  venture: Venture | null;
  isLoading: boolean;
  error: Error | null;
  ensureVentureForIdea: (ideaId: string, ideaTitle: string) => Promise<Venture>;
  refreshVenture: (ideaId: string) => Promise<void>;
}

export function useActiveVenture(): UseActiveVentureResult {
  const { user } = useAuth();
  const [venture, setVenture] = useState<Venture | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshVenture = useCallback(async (ideaId: string) => {
    if (!user) {
      setError(new Error("Not authenticated"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("ventures")
        .select("*")
        .eq("user_id", user.id)
        .eq("idea_id", ideaId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (data) {
        setVenture(data as Venture);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch venture"));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const ensureVentureForIdea = useCallback(async (ideaId: string, ideaTitle: string): Promise<Venture> => {
    if (!user) {
      throw new Error("Not authenticated");
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, check if a venture already exists for this idea
      const { data: existingVenture, error: fetchError } = await supabase
        .from("ventures")
        .select("*")
        .eq("user_id", user.id)
        .eq("idea_id", ideaId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingVenture) {
        setVenture(existingVenture as Venture);
        return existingVenture as Venture;
      }

      // Create a new venture for this idea
      const { data: newVenture, error: insertError } = await supabase
        .from("ventures")
        .insert({
          user_id: user.id,
          idea_id: ideaId,
          name: ideaTitle || "My Venture",
          status: "active",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setVenture(newVenture as Venture);
      return newVenture as Venture;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to ensure venture");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    venture,
    isLoading,
    error,
    ensureVentureForIdea,
    refreshVenture,
  };
}
