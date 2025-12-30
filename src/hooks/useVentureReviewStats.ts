import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Venture } from "@/types/venture";

interface DailyTask {
  id: string;
  title: string;
  completed: boolean;
}

interface CheckinRecord {
  id: string;
  checkin_date: string;
  completion_status: "yes" | "partial" | "no";
  explanation: string | null;
  reflection: string | null;
}

export interface VentureReviewStats {
  totalDays: number;
  daysWithTasks: number;
  totalTasks: number;
  tasksCompleted: number;
  completionRate: number;
  checkinDays: number;
  checkinRate: number;
  yesCount: number;
  partialCount: number;
  noCount: number;
  recentCheckins: CheckinRecord[];
}

export function useVentureReviewStats(venture: Venture | null) {
  return useQuery({
    queryKey: ["venture-review-stats", venture?.id],
    queryFn: async (): Promise<VentureReviewStats> => {
      if (!venture?.commitment_start_at || !venture?.commitment_end_at) {
        return {
          totalDays: 0,
          daysWithTasks: 0,
          totalTasks: 0,
          tasksCompleted: 0,
          completionRate: 0,
          checkinDays: 0,
          checkinRate: 0,
          yesCount: 0,
          partialCount: 0,
          noCount: 0,
          recentCheckins: [],
        };
      }

      const startDate = venture.commitment_start_at.split("T")[0];
      const endDate = venture.commitment_end_at.split("T")[0];

      // Fetch daily tasks
      const { data: dailyTasksData } = await supabase
        .from("venture_daily_tasks")
        .select("*")
        .eq("venture_id", venture.id)
        .gte("task_date", startDate)
        .lte("task_date", endDate);

      // Fetch check-ins
      const { data: checkinsData } = await supabase
        .from("venture_daily_checkins")
        .select("*")
        .eq("venture_id", venture.id)
        .gte("checkin_date", startDate)
        .lte("checkin_date", endDate)
        .order("checkin_date", { ascending: false });

      // Calculate stats
      const totalDays = venture.commitment_window_days || 14;
      const daysWithTasks = dailyTasksData?.length || 0;

      let totalTasks = 0;
      let tasksCompleted = 0;

      dailyTasksData?.forEach((day) => {
        const tasks = (day.tasks as unknown as DailyTask[]) || [];
        totalTasks += tasks.length;
        tasksCompleted += tasks.filter((t) => t.completed).length;
      });

      const completionRate = totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 0;

      const checkins = checkinsData || [];
      const checkinDays = checkins.length;
      const checkinRate = totalDays > 0 ? (checkinDays / totalDays) * 100 : 0;

      const yesCount = checkins.filter((c) => c.completion_status === "yes").length;
      const partialCount = checkins.filter((c) => c.completion_status === "partial").length;
      const noCount = checkins.filter((c) => c.completion_status === "no").length;

      // Get latest 7 check-ins
      const recentCheckins = checkins.slice(0, 7).map((c) => ({
        id: c.id,
        checkin_date: c.checkin_date,
        completion_status: c.completion_status as "yes" | "partial" | "no",
        explanation: c.explanation,
        reflection: c.reflection,
      }));

      return {
        totalDays,
        daysWithTasks,
        totalTasks,
        tasksCompleted,
        completionRate,
        checkinDays,
        checkinRate,
        yesCount,
        partialCount,
        noCount,
        recentCheckins,
      };
    },
    enabled: !!venture?.id,
  });
}
