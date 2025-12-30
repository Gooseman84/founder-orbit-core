import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import type { Venture } from "@/types/venture";
import type { Json } from "@/integrations/supabase/types";

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedMinutes: number;
  completed: boolean;
}

export interface DailyCheckin {
  id: string;
  checkin_date: string;
  completion_status: "yes" | "partial" | "no";
  explanation: string | null;
  reflection: string | null;
  created_at: string;
}

interface UseDailyExecutionResult {
  // Active venture context
  venture: Venture | null;
  
  // Commitment window progress
  commitmentProgress: {
    currentDay: number;
    totalDays: number;
    daysRemaining: number;
    isComplete: boolean;
    progressPercent: number;
  } | null;

  // Today's tasks
  dailyTasks: DailyTask[];
  isLoadingTasks: boolean;
  isGeneratingTasks: boolean;
  generateDailyTasksError: string | null;
  
  // Today's check-in
  todayCheckin: DailyCheckin | null;
  hasCheckedInToday: boolean;
  
  // Actions
  generateDailyTasks: () => Promise<void>;
  submitCheckin: (data: {
    completionStatus: "yes" | "partial" | "no";
    explanation?: string;
    reflection: string;
  }) => Promise<boolean>;
  markTaskCompleted: (taskId: string, completed: boolean) => void;
  
  // Refresh
  refetch: () => void;
}

export function useDailyExecution(venture: Venture | null): UseDailyExecutionResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localTasks, setLocalTasks] = useState<DailyTask[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const ventureId = venture?.id;

  // Calculate commitment window progress
  const commitmentProgress = venture?.commitment_start_at && venture?.commitment_end_at
    ? calculateProgress(venture.commitment_start_at, venture.commitment_end_at)
    : null;

  // Fetch today's daily tasks
  const { data: dailyTasksData, isLoading: isLoadingTasks, refetch: refetchTasks } = useQuery({
    queryKey: ["daily-tasks", ventureId, today],
    queryFn: async () => {
      if (!user || !ventureId) return null;
      
      const { data, error } = await supabase
        .from("venture_daily_tasks")
        .select("*")
        .eq("venture_id", ventureId)
        .eq("task_date", today)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!ventureId,
  });

  // Fetch today's check-in
  const { data: todayCheckin, refetch: refetchCheckin } = useQuery({
    queryKey: ["daily-checkin", ventureId, today],
    queryFn: async () => {
      if (!user || !ventureId) return null;
      
      const { data, error } = await supabase
        .from("venture_daily_checkins")
        .select("*")
        .eq("venture_id", ventureId)
        .eq("checkin_date", today)
        .maybeSingle();
      
      if (error) throw error;
      return data as DailyCheckin | null;
    },
    enabled: !!user && !!ventureId,
  });

  // Sync local tasks with fetched data
  useEffect(() => {
    if (dailyTasksData?.tasks) {
      const tasks = dailyTasksData.tasks as unknown as DailyTask[];
      setLocalTasks(Array.isArray(tasks) ? tasks : []);
    } else {
      setLocalTasks([]);
    }
  }, [dailyTasksData]);

  // Generate daily tasks from blueprint/venture plan
  const generateDailyTasks = useCallback(async () => {
    if (!user || !ventureId) return;
    
    setIsGenerating(true);
    setGenerateError(null);
    
    try {
      const { data, error } = await invokeAuthedFunction<{ tasks: DailyTask[] }>(
        "generate-daily-execution-tasks",
        { body: { ventureId } }
      );
      
      if (error) throw error;
      
      // Refetch to get the saved tasks
      await refetchTasks();
    } catch (err) {
      console.error("Error generating daily tasks:", err);
      setGenerateError(err instanceof Error ? err.message : "Failed to generate tasks");
    } finally {
      setIsGenerating(false);
    }
  }, [user, ventureId, refetchTasks]);

  // Submit daily check-in
  const submitCheckin = useCallback(async (data: {
    completionStatus: "yes" | "partial" | "no";
    explanation?: string;
    reflection: string;
  }): Promise<boolean> => {
    if (!user || !ventureId) return false;
    
    try {
      const { error } = await supabase
        .from("venture_daily_checkins")
        .upsert({
          user_id: user.id,
          venture_id: ventureId,
          checkin_date: today,
          completion_status: data.completionStatus,
          explanation: data.explanation || null,
          reflection: data.reflection,
        }, {
          onConflict: "venture_id,checkin_date"
        });
      
      if (error) throw error;
      
      await refetchCheckin();
      return true;
    } catch (err) {
      console.error("Error submitting check-in:", err);
      return false;
    }
  }, [user, ventureId, today, refetchCheckin]);

  // Mark task as completed (local state + persist)
  const markTaskCompleted = useCallback((taskId: string, completed: boolean) => {
    setLocalTasks(prev => {
      const updated = prev.map(task => 
        task.id === taskId ? { ...task, completed } : task
      );
      
      // Persist to database - cast to Json compatible type
      if (user && ventureId) {
        const tasksJson = JSON.parse(JSON.stringify(updated)) as Json;
        supabase
          .from("venture_daily_tasks")
          .update({ tasks: tasksJson })
          .eq("venture_id", ventureId)
          .eq("task_date", today)
          .then(({ error }) => {
            if (error) console.error("Error updating task:", error);
          });
      }
      
      return updated;
    });
  }, [user, ventureId, today]);

  const refetch = useCallback(() => {
    refetchTasks();
    refetchCheckin();
  }, [refetchTasks, refetchCheckin]);

  return {
    venture,
    commitmentProgress,
    dailyTasks: localTasks,
    isLoadingTasks,
    isGeneratingTasks: isGenerating,
    generateDailyTasksError: generateError,
    todayCheckin: todayCheckin ?? null,
    hasCheckedInToday: !!todayCheckin,
    generateDailyTasks,
    submitCheckin,
    markTaskCompleted,
    refetch,
  };
}

function calculateProgress(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const now = new Date();
  
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = now.getTime() - start.getTime();
  
  const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
  const currentDay = Math.max(1, Math.min(totalDays, Math.ceil(elapsedMs / (1000 * 60 * 60 * 24))));
  const daysRemaining = Math.max(0, totalDays - currentDay);
  const isComplete = now >= end;
  const progressPercent = Math.min(100, Math.round((currentDay / totalDays) * 100));
  
  return {
    currentDay,
    totalDays,
    daysRemaining,
    isComplete,
    progressPercent,
  };
}
