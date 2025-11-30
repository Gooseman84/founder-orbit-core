import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserContextData {
  profile: any | null;
  extendedIntake: any | null;
  chosenIdea: any | null;
  ideaAnalysis: any | null;
  recentDocs: any[];
  recentReflections: any[];
  recentTasks: any[];
  streakData: any | null;
  xpTotal: number;
}

export function useUserContext() {
  const { user } = useAuth();
  const [context, setContext] = useState<UserContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        profileRes,
        extendedIntakeRes,
        chosenIdeaRes,
        recentDocsRes,
        recentReflectionsRes,
        recentTasksRes,
        streakRes,
        xpRes,
      ] = await Promise.all([
        supabase
          .from("founder_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_intake_extended")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("ideas")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "chosen")
          .maybeSingle(),
        supabase
          .from("workspace_documents")
          .select("id, title, content, doc_type, status, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("daily_reflections")
          .select("*")
          .eq("user_id", user.id)
          .order("reflection_date", { ascending: false })
          .limit(7),
        supabase
          .from("tasks")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("daily_streaks")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.rpc("get_user_total_xp", { p_user_id: user.id }),
      ]);

      // Fetch idea analysis if there's a chosen idea
      let ideaAnalysis = null;
      if (chosenIdeaRes.data?.id) {
        const { data: analysis } = await supabase
          .from("idea_analysis")
          .select("*")
          .eq("user_id", user.id)
          .eq("idea_id", chosenIdeaRes.data.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        ideaAnalysis = analysis;
      }

      setContext({
        profile: profileRes.data ?? null,
        extendedIntake: extendedIntakeRes.data ?? null,
        chosenIdea: chosenIdeaRes.data ?? null,
        ideaAnalysis,
        recentDocs: recentDocsRes.data ?? [],
        recentReflections: recentReflectionsRes.data ?? [],
        recentTasks: recentTasksRes.data ?? [],
        streakData: streakRes.data ?? null,
        xpTotal: xpRes.data ?? 0,
      });
    } catch (err) {
      console.error("Error fetching user context:", err);
      setError("Failed to load context data");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  return { context, loading, error, refresh: fetchContext };
}
