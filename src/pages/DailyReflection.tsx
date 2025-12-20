import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";
import { DailyReflectionForm } from "@/components/reflection/DailyReflectionForm";
import { DailyReflectionInsights } from "@/components/reflection/DailyReflectionInsights";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/shared/SkeletonLoaders";
import { recordXpEvent } from "@/lib/xpEngine";
import { calculateReflectionStreak, STREAK_MILESTONES, hasReceivedStreakBonus } from "@/lib/streakEngine";
import { History, Calendar, Loader2, Flame } from "lucide-react";

export default function DailyReflection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh: refreshXP } = useXP();
  const { toast } = useToast();
  const { track } = useAnalytics();

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [todayReflection, setTodayReflection] = useState<any>(null);
  const [taskAccepted, setTaskAccepted] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loadingStreak, setLoadingStreak] = useState(true);

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

  // Fetch current streak
  useEffect(() => {
    const fetchStreak = async () => {
      if (!user?.id) return;
      
      setLoadingStreak(true);
      try {
        const streak = await calculateReflectionStreak(user.id);
        setCurrentStreak(streak);
      } catch (error) {
        console.error("Error fetching streak:", error);
      } finally {
        setLoadingStreak(false);
      }
    };

    fetchStreak();
  }, [user?.id, todayReflection]);

  // Memoize initial form values from today's reflection
  const initialFormValues = useMemo(() => {
    if (!todayReflection) return undefined;
    return {
      energy_level: todayReflection.energy_level,
      stress_level: todayReflection.stress_level,
      mood_tags: todayReflection.mood_tags,
      what_did: todayReflection.what_did,
      what_learned: todayReflection.what_learned,
      what_felt: todayReflection.what_felt,
      top_priority: todayReflection.top_priority,
      blockers: todayReflection.blockers,
    };
  }, [todayReflection]);

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
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await invokeAuthedFunction<{ reflection?: any }>(
        "generate-daily-reflection",
        {
          body: {
            reflectionDate: today,
            energyLevel: formData.energy_level,
            stressLevel: formData.stress_level,
            moodTags: formData.mood_tags,
            whatDid: formData.what_did,
            whatLearned: formData.what_learned,
            whatFelt: formData.what_felt,
            topPriority: formData.top_priority,
            blockers: formData.blockers,
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

      // Award XP only if this is a new reflection (no previous AI summary)
      if (!todayReflection?.ai_summary) {
        await recordXpEvent(user.id, "daily_reflection", 20, { 
          reflectionId: data.reflection.id 
        });
        
        // Calculate streak after saving and check for milestone bonuses
        const newStreak = await calculateReflectionStreak(user.id);
        setCurrentStreak(newStreak);
        
        // Check for streak milestones and award bonus XP
        let bonusMessage = "";
        for (const milestone of STREAK_MILESTONES) {
          if (newStreak >= milestone.days) {
            const alreadyAwarded = await hasReceivedStreakBonus(user.id, milestone.eventType);
            if (!alreadyAwarded) {
              await recordXpEvent(user.id, milestone.eventType, milestone.xp, {
                reflectionId: data.reflection.id,
                streak: newStreak
              });
              bonusMessage = `${milestone.emoji} ${milestone.message} +${milestone.xp} bonus XP`;
            }
          }
        }
        
        refreshXP();
        
        if (bonusMessage) {
          toast({
            title: "Check-in complete!",
            description: `Your insights are ready. You earned 20 XP! ${bonusMessage}`,
          });
        } else {
          toast({
            title: "Check-in complete!",
            description: "Your insights are ready. You earned 20 XP!",
          });
        }
      } else {
        toast({
          title: "Reflection updated!",
          description: "Your daily insights have been refreshed.",
        });
      }

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
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">Daily Pulse & Check-In</h1>
            {!loadingStreak && (
              <Badge variant={currentStreak > 0 ? "default" : "secondary"} className="gap-1">
                <Flame className={`h-3.5 w-3.5 ${currentStreak > 0 ? "text-orange-300" : ""}`} />
                {currentStreak} day{currentStreak !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {currentStreak === 0 && !todayReflection 
              ? "Start your streak today with your first check-in."
              : "Reflect on your day and get AI-powered insights"}
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
        <DailyReflectionForm 
          onSubmit={handleSubmit} 
          isLoading={isLoading} 
          initialValues={initialFormValues}
        />
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
