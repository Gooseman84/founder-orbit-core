import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface VentureTask {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  estimated_minutes: number | null;
  xp_reward: number | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  week_number: number | null;
  source: string | null;
  venture_id: string | null;
}

interface UseVentureTasksResult {
  tasks: VentureTask[];
  tasksByWeek: Record<number, VentureTask[]>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useVentureTasks(ventureId: string | null): UseVentureTasksResult {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["venture-tasks", user?.id, ventureId],
    queryFn: async () => {
      if (!user || !ventureId) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("venture_id", ventureId)
        .order("week_number", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as VentureTask[];
    },
    enabled: !!user && !!ventureId,
  });

  const tasks = data || [];

  // Group tasks by week number
  const tasksByWeek: Record<number, VentureTask[]> = {};
  for (const task of tasks) {
    const weekNum = task.week_number ?? 0;
    if (!tasksByWeek[weekNum]) {
      tasksByWeek[weekNum] = [];
    }
    tasksByWeek[weekNum].push(task);
  }

  return {
    tasks,
    tasksByWeek,
    isLoading,
    error: error instanceof Error ? error : null,
    refetch,
  };
}
