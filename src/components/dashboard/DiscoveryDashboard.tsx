import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { LevelBadge } from "@/components/shared/LevelBadge";
import { XpProgressBar } from "@/components/shared/XpProgressBar";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { NorthStarCard } from "./NorthStarCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/opportunity/ScoreGauge";
import { 
  AlertCircle, 
  Target, 
  Zap, 
  ListTodo, 
  TrendingUp, 
  Activity, 
  Radar, 
  FileText, 
  Flame, 
  BarChart3, 
  Scale, 
  Crown, 
  Sparkles 
} from "lucide-react";
import { calculateReflectionStreak } from "@/lib/streakEngine";

export function DiscoveryDashboard() {
  const { user } = useAuth();
  const { xpSummary, loading, error } = useXP();
  const { plan } = useSubscription();
  const navigate = useNavigate();
  const isFree = plan === "free";
  
  const [radarStats, setRadarStats] = useState({ recentCount: 0, topSignal: null as any });
  const [loadingRadar, setLoadingRadar] = useState(true);
  const [workspaceStats, setWorkspaceStats] = useState({ totalDocs: 0, recentDoc: null as any });
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [highestScore, setHighestScore] = useState<any>(null);
  const [loadingScore, setLoadingScore] = useState(true);
  const [reflectionStreak, setReflectionStreak] = useState(0);
  const [loadingReflectionStreak, setLoadingReflectionStreak] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRadarStats();
      fetchWorkspaceStats();
      fetchHighestScore();
      fetchReflectionStreak();
    }
  }, [user]);

  const fetchRadarStats = async () => {
    if (!user) return;
    setLoadingRadar(true);
    try {
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

  const fetchHighestScore = async () => {
    if (!user) return;
    setLoadingScore(true);
    try {
      const { data: scores, error: scoresError } = await supabase
        .from("opportunity_scores")
        .select("*, ideas(id, title)")
        .eq("user_id", user.id)
        .order("total_score", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (scoresError) throw scoresError;

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Explore ideas and find your next venture.
        </p>
      </div>

      {/* XP Progress Card - Compact */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Founder Progress</span>
            {!loading && xpSummary && <LevelBadge level={xpSummary.level} />}
          </div>
          {loading ? (
            <Skeleton className="h-2 w-full" />
          ) : error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : xpSummary ? (
            <XpProgressBar
              totalXp={xpSummary.totalXp}
              level={xpSummary.level}
              nextLevelXp={xpSummary.nextLevelXp}
              currentLevelMinXp={xpSummary.currentLevelMinXp}
              progressPercent={xpSummary.progressPercent}
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Pro Upgrade CTA */}
      {isFree && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Unlock TrueBlazer Pro</span>
            </div>
            <UpgradeButton variant="full" />
          </CardContent>
        </Card>
      )}

      {/* North Star Card */}
      <NorthStarCard />

      {/* Quick Action Grid */}
      <div className="grid gap-3 grid-cols-2">
        {/* Niche Radar */}
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/radar")}>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Radar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Niche Radar</span>
            </div>
            {loadingRadar ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <span className="text-xl font-bold">{radarStats.recentCount}</span>
            )}
            <p className="text-xs text-muted-foreground">signals this week</p>
          </CardContent>
        </Card>

        {/* Workspace */}
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/workspace")}>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Workspace</span>
            </div>
            {loadingWorkspace ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <span className="text-xl font-bold">{workspaceStats.totalDocs}</span>
            )}
            <p className="text-xs text-muted-foreground">documents</p>
          </CardContent>
        </Card>

        {/* Opportunity Score */}
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/ideas")}>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Top Score</span>
            </div>
            {loadingScore ? (
              <Skeleton className="h-6 w-16" />
            ) : highestScore ? (
              <span className="text-xl font-bold">{highestScore.total_score}</span>
            ) : (
              <span className="text-xl font-bold text-muted-foreground">—</span>
            )}
            <p className="text-xs text-muted-foreground truncate">
              {highestScore?.ideas?.title || "No scores yet"}
            </p>
          </CardContent>
        </Card>

        {/* Reflection Streak */}
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/daily-reflection")}>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className={`h-4 w-4 ${reflectionStreak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">Streak</span>
            </div>
            {loadingReflectionStreak ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <span className="text-xl font-bold">{reflectionStreak}</span>
            )}
            <p className="text-xs text-muted-foreground">day{reflectionStreak !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
      </div>

      {/* Primary Actions */}
      <div className="grid gap-2 grid-cols-2">
        <Button className="gap-2" onClick={() => navigate("/ideas")}>
          <Sparkles className="h-4 w-4" />
          Explore Ideas
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => navigate("/ideas/compare")}>
          <Scale className="h-4 w-4" />
          Compare Ideas
        </Button>
      </div>
    </div>
  );
}
