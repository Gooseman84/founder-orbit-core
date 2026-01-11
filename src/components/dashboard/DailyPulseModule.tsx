import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CheckCircle2, ArrowRight, Pencil } from "lucide-react";
import { format, startOfDay } from "date-fns";

export function DailyPulseModule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todayReflection, setTodayReflection] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTodayReflection();
    }
  }, [user]);

  const fetchTodayReflection = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const today = format(startOfDay(new Date()), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("daily_reflections")
        .select("*")
        .eq("user_id", user.id)
        .eq("reflection_date", today)
        .maybeSingle();

      if (error) throw error;
      setTodayReflection(data);
    } catch (error) {
      console.error("Error fetching today's reflection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasCompleted = !!todayReflection?.ai_summary;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Daily Pulse</CardTitle>
          </div>
          {hasCompleted && (
            <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
              <CheckCircle2 className="h-3 w-3" />
              Completed today
            </Badge>
          )}
        </div>
        <CardDescription>
          Quick check-in to track your energy, mood, and progress.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : hasCompleted ? (
          <div className="space-y-3">
            {todayReflection.ai_theme && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                <span className="font-medium text-foreground">Today's theme:</span> {todayReflection.ai_theme}
              </p>
            )}
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={() => navigate("/daily-reflection")}
            >
              <Pencil className="h-4 w-4" />
              View / Edit
            </Button>
          </div>
        ) : (
          <Button 
            className="w-full gap-2"
            onClick={() => navigate("/daily-reflection")}
          >
            <Activity className="h-4 w-4" />
            Start Daily Pulse
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
