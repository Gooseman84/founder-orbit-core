import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfWeek, subWeeks } from "date-fns";

export type ContextEventType = 
  | 'idea_created' 
  | 'idea_chosen' 
  | 'idea_analysis' 
  | 'doc_created' 
  | 'doc_updated' 
  | 'weekly_pattern';

export interface ContextEvent {
  date: string;
  type: ContextEventType;
  title: string;
  description: string;
}

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
  contextHistory: ContextEvent[];
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

function buildContextHistory(
  ideas: any[],
  analyses: any[],
  docs: any[],
  reflections: any[]
): ContextEvent[] {
  const events: ContextEvent[] = [];

  // Idea events (created & chosen)
  ideas.slice(0, 5).forEach((idea) => {
    if (idea.status === "chosen") {
      events.push({
        date: format(new Date(idea.created_at), "yyyy-MM-dd"),
        type: "idea_chosen",
        title: idea.title,
        description: `"${idea.title}" selected as North Star idea.`,
      });
    } else {
      events.push({
        date: format(new Date(idea.created_at), "yyyy-MM-dd"),
        type: "idea_created",
        title: idea.title,
        description: `New idea "${idea.title}" created.`,
      });
    }
  });

  // Idea analysis events
  analyses.slice(0, 3).forEach((analysis) => {
    const ideaTitle = ideas.find((i) => i.id === analysis.idea_id)?.title || "Idea";
    events.push({
      date: format(new Date(analysis.created_at), "yyyy-MM-dd"),
      type: "idea_analysis",
      title: `${ideaTitle} Analyzed`,
      description: `Deep analysis completed for "${ideaTitle}".`,
    });
  });

  // Document events (important types only)
  const importantDocs = docs.filter(
    (d) => ["strategy", "offer", "vision", "outline", "plan"].includes(d.doc_type)
  );
  importantDocs.slice(0, 5).forEach((doc) => {
    const isNew = new Date(doc.created_at).getTime() === new Date(doc.updated_at).getTime();
    events.push({
      date: format(new Date(doc.updated_at), "yyyy-MM-dd"),
      type: isNew ? "doc_created" : "doc_updated",
      title: doc.title,
      description: isNew
        ? `New ${doc.doc_type || "document"} "${doc.title}" created.`
        : `${doc.doc_type || "Document"} "${doc.title}" updated.`,
    });
  });

  // Weekly reflection patterns (last 4 weeks)
  const now = new Date();
  for (let i = 0; i < 4; i++) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekReflections = reflections.filter((r) => {
      const date = new Date(r.reflection_date);
      return date >= weekStart && date <= weekEnd;
    });

    if (weekReflections.length > 0) {
      const avgEnergy = weekReflections.reduce((sum, r) => sum + (r.energy_level || 0), 0) / weekReflections.length;
      const avgStress = weekReflections.reduce((sum, r) => sum + (r.stress_level || 0), 0) / weekReflections.length;
      const themes = [...new Set(weekReflections.map((r) => r.ai_theme).filter(Boolean))];
      
      let energyTrend = "stable";
      if (avgEnergy >= 3.5) energyTrend = "up";
      else if (avgEnergy < 2.5) energyTrend = "down";

      let stressTrend = "stable";
      if (avgStress >= 3.5) stressTrend = "high";
      else if (avgStress < 2.5) stressTrend = "low";

      const themeText = themes.length > 0 ? `Theme: "${themes[0]}"` : "";

      events.push({
        date: format(weekStart, "yyyy-MM-dd"),
        type: "weekly_pattern",
        title: `Week of ${format(weekStart, "MMM d")}`,
        description: `Energy ${energyTrend}, stress ${stressTrend}${themeText ? `. ${themeText}` : ""}. ${weekReflections.length} check-ins.`,
      });
    }
  }

  // Sort by date descending and limit to 20
  return events
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);
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
        allIdeasRes,
        allAnalysesRes,
        allDocsForHistoryRes,
        allReflectionsForHistoryRes,
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
        // Additional queries for context history
        supabase
          .from("ideas")
          .select("id, title, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("idea_analysis")
          .select("id, idea_id, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("workspace_documents")
          .select("id, title, doc_type, created_at, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(10),
        supabase
          .from("daily_reflections")
          .select("reflection_date, energy_level, stress_level, ai_theme")
          .eq("user_id", user.id)
          .order("reflection_date", { ascending: false })
          .limit(30),
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

      // Build context history
      const contextHistory = buildContextHistory(
        allIdeasRes.data ?? [],
        allAnalysesRes.data ?? [],
        allDocsForHistoryRes.data ?? [],
        allReflectionsForHistoryRes.data ?? []
      );

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
        contextHistory,
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
