import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { useToast } from "@/hooks/use-toast";
import { DailyReflectionForm } from "@/components/reflection/DailyReflectionForm";
import { DailyReflectionInsights } from "@/components/reflection/DailyReflectionInsights";
import { Button } from "@/components/ui/button";
import { recordXpEvent } from "@/lib/xpEngine";
import { History, Calendar, Loader2 } from "lucide-react";

export default function DailyReflection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh: refreshXP } = useXP();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [todayReflection, setTodayReflection] = useState<any>(null);
  const [taskAccepted, setTaskAccepted] = useState(false);

  // Fetch today's reflection on load
  useEffect(() => {
    const fetchTodayReflection = async () => {
      if (!user?.id) return;

      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from("daily_reflections")
          .select("*")
          .eq("user_id", user.id)
          .eq("reflection_date", today)
          .maybeSingle();

        if (error) {
          console.error("Error fetching reflection:", error);
          return;
        }

        if (data) {
          setTodayReflection(data);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchTodayReflection();
  }, [user?.id]);

  const handleSubmit = async (formData: {
    energy_level: number;
    stress_level: number;
    mood_tags: string[];
    what_did: string;
    what_learned: string;
    what_felt: string;
    top_priority: string;
    blockers: string;
  }) => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to complete your daily check-in.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-daily-reflection",
        {
          body: {
            userId: user.id,
            ...formData,
          },
        }
      );

      if (error) {
        console.error("Error generating reflection:", error);
        throw error;
      }

      if (!data?.reflection) {
        throw new Error("No reflection data returned");
      }

      setTodayReflection(data.reflection);
      setTaskAccepted(false);

      // Award XP
      await recordXpEvent(user.id, "daily_reflection", 20, { 
        reflectionId: data.reflection.id 
      });
      refreshXP();

      toast({
        title: "Check-in complete!",
        description: "Your insights are ready. You earned 20 XP!",
      });

    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process check-in.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptTask = async (task: { title: string; description: string; xp_reward: number; type: string }) => {
    if (!user?.id || !todayReflection?.id) return;

    try {
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title: task.title,
        description: task.description,
        type: task.type,
        xp_reward: task.xp_reward,
        status: "pending",
        metadata: { source: "daily_reflection", reflection_id: todayReflection.id },
      });

      if (error) throw error;

      setTaskAccepted(true);

      // Award XP for accepting
      await recordXpEvent(user.id, "task_created_from_reflection", 5, { 
        reflectionId: todayReflection.id 
      });
      refreshXP();

      toast({
        title: "Task added!",
        description: "The suggested task has been added to your tasks. +5 XP",
      });

    } catch (error) {
      console.error("Error adding task:", error);
      toast({
        title: "Error",
        description: "Failed to add task.",
        variant: "destructive",
      });
    }
  };

  if (isFetching) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Pulse & Check-In</h1>
          <p className="text-muted-foreground mt-1">
            Reflect on your day and get AI-powered insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/weekly-review")}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Weekly Review
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/reflection/history")}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            History
          </Button>
        </div>
      </div>

      {/* Today's Insights (if already submitted) */}
      {todayReflection?.ai_summary && (
        <DailyReflectionInsights 
          reflection={todayReflection}
          onAcceptTask={handleAcceptTask}
          taskAccepted={taskAccepted}
        />
      )}

      {/* Form */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {todayReflection?.ai_summary ? "Update Today's Check-In" : "Start Today's Check-In"}
          </h2>
        </div>
        <DailyReflectionForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>

      {/* Info for first-timers */}
      {!todayReflection && (
        <div className="bg-muted/50 rounded-lg p-6 space-y-2">
          <h3 className="font-semibold">What is the Daily Pulse & Check-In?</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This unified daily practice combines mood tracking with reflective journaling. 
            Our AI coach analyzes your input and provides a personalized summary, theme of 
            the day, and actionable micro-tasks for tomorrow. Complete check-ins regularly 
            to unlock weekly summaries and build momentum!
          </p>
        </div>
      )}
    </div>
  );
}
