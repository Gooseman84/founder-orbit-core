import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { supabase } from "@/integrations/supabase/client";
import { LevelBadge } from "@/components/shared/LevelBadge";
import { XpProgressBar } from "@/components/shared/XpProgressBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Target, Zap, ListTodo, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const { xpSummary, loading, error } = useXP();
  const navigate = useNavigate();
  const [taskStats, setTaskStats] = useState({
    total: 0,
    open: 0,
    completed: 0,
    microTasks: 0,
    quests: 0,
  });
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTaskStats();
    }
  }, [user]);

  const fetchTaskStats = async () => {
    if (!user) return;

    setLoadingTasks(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("status, type")
        .eq("user_id", user.id);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        open: data?.filter(t => t.status !== "completed").length || 0,
        completed: data?.filter(t => t.status === "completed").length || 0,
        microTasks: data?.filter(t => t.type === "micro").length || 0,
        quests: data?.filter(t => t.type === "quest").length || 0,
      };

      setTaskStats(stats);
    } catch (error) {
      console.error("Error fetching task stats:", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Track your progress, manage tasks, and stay on top of your founder journey.
        </p>
      </div>

      {/* XP Progress Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Founder Progress</CardTitle>
              <CardDescription>
                Level up by completing tasks, generating ideas, and building your business
              </CardDescription>
            </div>
            {!loading && xpSummary && <LevelBadge level={xpSummary.level} />}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : xpSummary ? (
            <XpProgressBar
              totalXp={xpSummary.totalXp}
              level={xpSummary.level}
              nextLevelXp={xpSummary.nextLevelXp}
              currentLevelMinXp={xpSummary.currentLevelMinXp}
              progressPercent={xpSummary.progressPercent}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No XP data available. Start completing tasks to earn experience!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Task Statistics and Recent Feed */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Your Tasks
            </CardTitle>
            <CardDescription>Track your micro-tasks and founder quests</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTasks ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Task Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <ListTodo className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Open Tasks</span>
                    </div>
                    <p className="text-2xl font-bold">{taskStats.open}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-muted-foreground">Completed</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{taskStats.completed}</p>
                  </div>
                </div>

                {/* Task Type Breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Micro Tasks</span>
                    </div>
                    <span className="text-sm font-bold">{taskStats.microTasks}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Founder Quests</span>
                    </div>
                    <span className="text-sm font-bold">{taskStats.quests}</span>
                  </div>
                </div>

                {/* View Tasks Button */}
                <Button 
                  onClick={() => navigate("/tasks")} 
                  className="w-full"
                  variant="default"
                >
                  View All Tasks
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Feed</CardTitle>
            <CardDescription>Latest insights and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
