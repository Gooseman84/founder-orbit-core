import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { LevelBadge } from "@/components/shared/LevelBadge";
import { XpProgressBar } from "@/components/shared/XpProgressBar";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Target, Zap, ListTodo, TrendingUp, Activity, Radar, FileText, Flame, BarChart3, Scale, Crown, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/opportunity/ScoreGauge";
import { calculateReflectionStreak } from "@/lib/streakEngine";

const Dashboard = () => {
  const { user } = useAuth();
  const { xpSummary, loading, error } = useXP();
  const { plan } = useSubscription();
  const navigate = useNavigate();
  const isFree = plan === "free";
  const [taskStats, setTaskStats] = useState({
    total: 0,
    open: 0,
    completed: 0,
    microTasks: 0,
    quests: 0,
  });
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [todayReflection, setTodayReflection] = useState<any>(null);
  const [loadingReflection, setLoadingReflection] = useState(true);
  const [radarStats, setRadarStats] = useState({
    recentCount: 0,
    topSignal: null as any,
  });
  const [loadingRadar, setLoadingRadar] = useState(true);
  const [workspaceStats, setWorkspaceStats] = useState({
    totalDocs: 0,
    recentDoc: null as any,
  });
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [streakData, setStreakData] = useState({
    current_streak: 0,
    longest_streak: 0,
  });
  const [loadingStreak, setLoadingStreak] = useState(true);
  const [highestScore, setHighestScore] = useState<any>(null);
  const [loadingScore, setLoadingScore] = useState(true);
  const [reflectionStreak, setReflectionStreak] = useState(0);
  const [loadingReflectionStreak, setLoadingReflectionStreak] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTaskStats();
      fetchTodayReflection();
      fetchRadarStats();
      fetchWorkspaceStats();
      fetchStreakData();
      fetchHighestScore();
      fetchReflectionStreak();
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

  const fetchTodayReflection = async () => {
    if (!user) return;

    setLoadingReflection(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
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
      setLoadingReflection(false);
    }
  };

  const fetchReflectionStreak = async () => {
    if (!user) return;

    setLoadingReflectionStreak(true);
    try {
      const streak = await calculateReflectionStreak(user.id);
      setReflectionStreak(streak);
    } catch (error) {
      console.error("Error fetching reflection streak:", error);
    } finally {
      setLoadingReflectionStreak(false);
    }
  };

  const fetchRadarStats = async () => {
    if (!user) return;

    setLoadingRadar(true);
    try {
      // Get signals from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: allSignals, error } = await supabase
        .from("niche_radar")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("priority_score", { ascending: false });

      if (error) throw error;

      setRadarStats({
        recentCount: allSignals?.length || 0,
        topSignal: allSignals?.[0] || null,
      });
    } catch (error) {
      console.error("Error fetching radar stats:", error);
    } finally {
      setLoadingRadar(false);
    }
  };

  const fetchWorkspaceStats = async () => {
    if (!user) return;

    setLoadingWorkspace(true);
    try {
      const { data, error } = await supabase
        .from("workspace_documents")
        .select("id, title, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setWorkspaceStats({
        totalDocs: data?.length || 0,
        recentDoc: data?.[0] || null,
      });
    } catch (error) {
      console.error("Error fetching workspace stats:", error);
    } finally {
      setLoadingWorkspace(false);
    }
  };

  const fetchStreakData = async () => {
    if (!user) return;

    setLoadingStreak(true);
    try {
      const { data, error } = await supabase
        .from("daily_streaks")
        .select("current_streak, longest_streak")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      setStreakData({
        current_streak: data?.current_streak || 0,
        longest_streak: data?.longest_streak || 0,
      });
    } catch (error) {
      console.error("Error fetching streak data:", error);
    } finally {
      setLoadingStreak(false);
    }
  };

  const fetchHighestScore = async () => {
    if (!user) return;

    setLoadingScore(true);
    try {
      // Fetch highest opportunity score for user with joined idea data
      const { data: scores, error: scoresError } = await supabase
        .from("opportunity_scores")
        .select("*, ideas(id, title)")
        .eq("user_id", user.id)
        .order("total_score", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (scoresError) throw scoresError;

      // Only set if we have both score and valid idea reference
      if (scores && scores.ideas) {
        setHighestScore(scores);
      } else {
        setHighestScore(null);
      }
    } catch (error) {
      console.error("Error fetching highest score:", error);
    } finally {
      setLoadingScore(false);
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

      {/* Pro Upgrade CTA for Free Users */}
      {isFree && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/20 ring-1 ring-primary/30">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Unlock TrueBlazer Pro</h3>
                <p className="text-sm text-muted-foreground">Unlimited ideas, all modes, full blueprints & more</p>
              </div>
            </div>
            <UpgradeButton variant="full" />
          </CardContent>
        </Card>
      )}

      {/* Task Statistics, Daily Pulse, and Recent Feed */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Pulse & Check-In Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {todayReflection ? "Today's Pulse & Check-In" : "Daily Pulse & Check-In"}
              {!loadingReflectionStreak && (
                <Badge variant={reflectionStreak > 0 ? "default" : "secondary"} className="gap-1 ml-auto">
                  <Flame className={`h-3 w-3 ${reflectionStreak > 0 ? "text-orange-300" : ""}`} />
                  {reflectionStreak} day{reflectionStreak !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {todayReflection 
                ? "Reflection complete" 
                : reflectionStreak === 0 
                  ? "Do your first check-in today to start your streak."
                  : "You haven't checked in yet today."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReflection ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : todayReflection ? (
              <div className="space-y-4">
                {/* Energy & Stress Levels */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Energy</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{todayReflection.energy_level || '-'}</span>
                      <span className="text-sm text-muted-foreground">/5</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Stress</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{todayReflection.stress_level || '-'}</span>
                      <span className="text-sm text-muted-foreground">/5</span>
                    </div>
                  </div>
                </div>

                {/* Mood Tags */}
                {todayReflection.mood_tags && todayReflection.mood_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {todayReflection.mood_tags.slice(0, 3).map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {todayReflection.mood_tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{todayReflection.mood_tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* AI Summary Preview */}
                {todayReflection.ai_summary && (
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Today's Insight</p>
                    <p className="text-sm line-clamp-2">
                      {todayReflection.ai_summary.length > 140 
                        ? `${todayReflection.ai_summary.slice(0, 140)}...` 
                        : todayReflection.ai_summary}
                    </p>
                  </div>
                )}

                {/* View / Update Button */}
                <Button 
                  onClick={() => navigate("/daily-reflection")} 
                  variant="outline"
                  className="w-full"
                >
                  View / Update Today
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* No Reflection Today - CTA */}
                <div className="text-center py-6">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Log your day, track your energy, and get AI-powered insights.
                  </p>
                </div>

                {/* Start Check-In Button */}
                <Button 
                  onClick={() => navigate("/daily-reflection")} 
                  className="w-full"
                  size="lg"
                >
                  Start Today's Check-In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

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
            <CardTitle className="flex items-center gap-2">
              <Radar className="h-5 w-5" />
              Niche Radar
            </CardTitle>
            <CardDescription>Market signals and emerging opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRadar ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : radarStats.recentCount > 0 ? (
              <div className="space-y-4">
                {/* Signal Count */}
                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Signals (Last 7 Days)</span>
                  </div>
                  <p className="text-2xl font-bold">{radarStats.recentCount}</p>
                </div>

                {/* Top Priority Signal */}
                {radarStats.topSignal && (
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Highest Priority</p>
                    <p className="text-sm font-semibold line-clamp-2">{radarStats.topSignal.title}</p>
                    <Badge variant="outline" className="mt-2">
                      Priority: {radarStats.topSignal.priority_score}
                    </Badge>
                  </div>
                )}

                {/* View Radar Button */}
                <Button 
                  onClick={() => navigate("/radar")} 
                  variant="default"
                  className="w-full"
                >
                  View Radar
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <Radar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-semibold mb-1">No signals yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate market signals to discover emerging opportunities
                  </p>
                </div>

                <Button 
                  onClick={() => navigate("/radar")} 
                  variant="default"
                  className="w-full"
                >
                  Generate Signals
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Workspace
            </CardTitle>
            <CardDescription>Your builder documents and content</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingWorkspace ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : workspaceStats.totalDocs > 0 ? (
              <div className="space-y-4">
                {/* Document Count */}
                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Total Documents</span>
                  </div>
                  <p className="text-2xl font-bold">{workspaceStats.totalDocs}</p>
                </div>

                {/* Most Recent Document */}
                {workspaceStats.recentDoc && (
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Recently Updated</p>
                    <p className="text-sm font-semibold line-clamp-2">{workspaceStats.recentDoc.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(workspaceStats.recentDoc.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Open Workspace Button */}
                <Button 
                  onClick={() => navigate("/workspace")} 
                  variant="default"
                  className="w-full"
                >
                  Open Workspace
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-semibold mb-1">No documents yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create documents to organize your ideas and strategies
                  </p>
                </div>

                <Button 
                  onClick={() => navigate("/workspace")} 
                  variant="default"
                  className="w-full"
                >
                  Create Document
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Streak Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Daily Streak
            </CardTitle>
            <CardDescription>Build momentum with daily consistency</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStreak ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current Streak */}
                <div className="flex items-center gap-4">
                  <Flame 
                    className={`h-12 w-12 ${
                      streakData.current_streak > 0 
                        ? "text-orange-500 fill-orange-500" 
                        : "text-muted-foreground"
                    }`}
                  />
                  <div>
                    <div className="text-2xl font-bold">
                      {streakData.current_streak > 0 ? (
                        <>Day {streakData.current_streak}</>
                      ) : (
                        <span className="text-muted-foreground">No streak</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Longest: {streakData.longest_streak} {streakData.longest_streak === 1 ? "day" : "days"}
                    </p>
                  </div>
                </div>

                {/* Record Today Button */}
                <Button 
                  onClick={() => navigate("/streak")} 
                  variant="default"
                  className="w-full"
                >
                  Record Today
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opportunity Score Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Opportunity Score
            </CardTitle>
            <CardDescription>Your highest-rated business idea</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingScore ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : highestScore ? (
              <div className="space-y-4">
                {/* Idea Title */}
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Top Idea</p>
                  <p className="text-sm font-semibold line-clamp-2">{highestScore.ideas?.title || "Unknown Idea"}</p>
                </div>

                {/* Score Gauge */}
                <div className="flex justify-center py-2">
                  <ScoreGauge value={highestScore.total_score || 0} size={140} />
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button 
                    onClick={() => navigate("/ideas")} 
                    variant="default"
                    className="w-full"
                  >
                    View All Scores
                  </Button>
                  <Button 
                    onClick={() => navigate("/ideas/compare")} 
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Scale className="w-4 h-4" />
                    Compare Ideas
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-semibold mb-1">No scores yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate opportunity scores to evaluate your ideas
                  </p>
                </div>

                <Button 
                  onClick={() => navigate("/ideas")} 
                  variant="default"
                  className="w-full"
                >
                  View Ideas
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
