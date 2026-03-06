import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface NextStep {
  id: string;
  message: string;
  cta: string;
  href: string;
}

export function useNextStep() {
  const { user } = useAuth();

  return useQuery<NextStep | null>({
    queryKey: ["next-step", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<NextStep | null> => {
      if (!user) return null;
      const uid = user.id;

      // 1. Completed interview?
      const { data: interview } = await supabase
        .from("founder_interviews")
        .select("id")
        .eq("user_id", uid)
        .eq("status", "completed")
        .limit(1)
        .maybeSingle();

      if (!interview) {
        return {
          id: "complete_interview",
          message: "Mavrik is ready to interview you — this unlocks personalized idea generation.",
          cta: "Start Interview",
          href: "/discover",
        };
      }

      // 1b. Lightning Round completed?
      const { data: profile } = await supabase
        .from("founder_profiles")
        .select("lightning_round_completed_at, interview_completed_at")
        .eq("user_id", uid)
        .maybeSingle();

      if (profile && !profile.lightning_round_completed_at) {
        return {
          id: "complete_lightning_round",
          message: "Almost there — complete the Lightning Round to unlock your personalized ideas.",
          cta: "Continue",
          href: "/discover",
        };
      }

      // 2. Has saved ideas?
      const { count: ideaCount } = await supabase
        .from("ideas")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);

      if (!ideaCount || ideaCount === 0) {
        return {
          id: "generate_ideas",
          message: "Your interview is complete. Generate your first set of personalized ideas.",
          cta: "See Your Ideas",
          href: "/ideas",
        };
      }

      // 3. Any idea with FVS score?
      const { count: fvsCount } = await supabase
        .from("financial_viability_scores")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);

      if (!fvsCount || fvsCount === 0) {
        return {
          id: "calculate_fvs",
          message: "You have ideas saved — run a Financial Viability Score to find which one is worth building.",
          cta: "Score an Idea",
          href: "/ideas",
        };
      }

      // 4. Active venture?
      const { data: venture } = await supabase
        .from("ventures")
        .select("id, idea_id")
        .eq("user_id", uid)
        .eq("venture_state", "executing")
        .limit(1)
        .maybeSingle();

      if (!venture) {
        return {
          id: "start_venture",
          message: "You have a scored idea. Commit to it and start your 30-day execution window.",
          cta: "Commit to an Idea",
          href: "/ideas",
        };
      }

      // 5. Has blueprint?
      const { data: blueprint } = await supabase
        .from("founder_blueprints")
        .select("id")
        .eq("user_id", uid)
        .limit(1)
        .maybeSingle();

      if (!blueprint) {
        return {
          id: "generate_blueprint",
          message: "Venture started — generate your Blueprint to unlock daily tasks and your Implementation Kit.",
          cta: "Generate Blueprint",
          href: "/blueprint",
        };
      }

      // 6. Has completed implementation kit?
      const { data: kit } = await supabase
        .from("implementation_kits")
        .select("id")
        .eq("user_id", uid)
        .eq("venture_id", venture.id)
        .eq("status", "complete")
        .limit(1)
        .maybeSingle();

      if (!kit) {
        return {
          id: "generate_kit",
          message: "Your Blueprint is ready. Generate your Implementation Kit to get build-ready specs.",
          cta: "Generate Kit",
          href: "/blueprint",
        };
      }

      // 7. Tasks for today?
      const today = new Date().toISOString().split("T")[0];
      const { data: dailyTasks } = await supabase
        .from("venture_daily_tasks")
        .select("id")
        .eq("user_id", uid)
        .eq("venture_id", venture.id)
        .eq("task_date", today)
        .limit(1)
        .maybeSingle();

      if (!dailyTasks) {
        return {
          id: "generate_tasks",
          message: "Your kit is ready. Generate today's tasks and start building.",
          cta: "Get Today's Tasks",
          href: "/dashboard",
        };
      }

      // 8. Check-in today? (daily_reflections with reflection_date = today)
      const { data: checkin } = await supabase
        .from("daily_reflections")
        .select("id")
        .eq("user_id", uid)
        .eq("reflection_date", today)
        .limit(1)
        .maybeSingle();

      if (!checkin) {
        return {
          id: "checkin_today",
          message: "You have tasks for today — check in when you're done to keep your streak alive.",
          cta: "Check In",
          href: "/dashboard",
        };
      }

      // Fully active — nothing to show
      return null;
    },
  });
}
