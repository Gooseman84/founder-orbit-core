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
  profileCompleteness: number;
}

function calculateProfileCompleteness(
  profile: any | null,
  extendedIntake: any | null,
  chosenIdea: any | null
): number {
  let score = 0;

  // Founder profile fields (70 points max)
  if (profile) {
    if (profile.passions_text || profile.passions_tags?.length) score += 15;
    if (profile.skills_text || profile.skills_tags?.length) score += 15;
    if (profile.time_per_week) score += 10;
    if (profile.capital_available) score += 10;
    if (profile.risk_tolerance) score += 10;
    if (profile.success_vision) score += 10;
  }

  // Extended intake fields (20 points max)
  if (extendedIntake) {
    if (extendedIntake.deep_desires) score += 10;
    if (extendedIntake.fears) score += 5;
    if (extendedIntake.energy_givers || extendedIntake.energy_drainers) score += 5;
  }

  // Chosen idea (10 points)
  if (chosenIdea) score += 10;

  // Cap at 100 and round to nearest 5
  return Math.min(100, Math.round(score / 5) * 5);
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

      const profileData = profileRes.data ?? null;
      const extendedIntakeData = extendedIntakeRes.data ?? null;
      const chosenIdeaData = chosenIdeaRes.data ?? null;

      setContext({
        profile: profileData,
        extendedIntake: extendedIntakeData,
        chosenIdea: chosenIdeaData,
        ideaAnalysis,
        recentDocs: recentDocsRes.data ?? [],
        recentReflections: recentReflectionsRes.data ?? [],
        recentTasks: recentTasksRes.data ?? [],
        streakData: streakRes.data ?? null,
        xpTotal: xpRes.data ?? 0,
        profileCompleteness: calculateProfileCompleteness(profileData, extendedIntakeData, chosenIdeaData),
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
