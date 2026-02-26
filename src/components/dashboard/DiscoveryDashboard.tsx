import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LevelBadge } from "@/components/shared/LevelBadge";
import { XpProgressBar } from "@/components/shared/XpProgressBar";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { NorthStarCard } from "./NorthStarCard";
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Radar, 
  FileText, 
  Flame, 
  BarChart3, 
  Crown, 
  Sparkles,
  Scale,
  Lock
} from "lucide-react";

const DASHBOARD_STALE_TIME = 3 * 60 * 1000; // 3 minutes

export function DiscoveryDashboard() {
  const { user } = useAuth();
  const { xpSummary, loading, error } = useXP();
  const { plan } = useSubscription();
  const { hasPro, hasFounder, features } = useFeatureAccess();
  const navigate = useNavigate();
  const isFree = plan === "free";
  const [paywallReason, setPaywallReason] = useState<string | null>(null);

  const canShowRadar = features.canUseRadar !== "none";
  const canCompare = features.canCompareIdeas;

  const { data: radarStats, isLoading: loadingRadar } = useQuery({
    queryKey: ["dashboard-radar-stats", user?.id],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: allSignals, error } = await supabase
        .from("niche_radar")
        .select("*")
        .eq("user_id", user!.id)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("priority_score", { ascending: false });
      if (error) throw error;
      return { recentCount: allSignals?.length || 0, topSignal: allSignals?.[0] || null };
    },
    enabled: !!user,
    staleTime: DASHBOARD_STALE_TIME,
  });

  const { data: workspaceStats, isLoading: loadingWorkspace } = useQuery({
    queryKey: ["dashboard-workspace-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_documents")
        .select("id, title, updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return { totalDocs: data?.length || 0, recentDoc: data?.[0] || null };
    },
    enabled: !!user,
    staleTime: DASHBOARD_STALE_TIME,
  });

  const { data: highestScore, isLoading: loadingScore } = useQuery({
    queryKey: ["dashboard-highest-score", user?.id],
    queryFn: async () => {
      const { data: scores, error: scoresError } = await supabase
        .from("opportunity_scores")
        .select("*, ideas(id, title)")
        .eq("user_id", user!.id)
        .order("total_score", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (scoresError) throw scoresError;
      return scores && scores.ideas ? scores : null;
    },
    enabled: !!user,
    staleTime: DASHBOARD_STALE_TIME,
  });

  const { data: reflectionStreak = 0, isLoading: loadingReflectionStreak } = useQuery({
    queryKey: ["dashboard-reflection-streak", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_reflections")
        .select("reflection_date")
        .eq("user_id", user!.id)
        .order("reflection_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      if (!data || data.length === 0) return 0;
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 0; i < data.length; i++) {
        const expected = new Date(today);
        expected.setDate(expected.getDate() - i);
        const dateStr = expected.toISOString().split("T")[0];
        if (data[i].reflection_date === dateStr) {
          streak++;
        } else break;
      }
      return streak;
    },
    enabled: !!user,
    staleTime: DASHBOARD_STALE_TIME,
  });

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
        {/* Niche Radar — hidden for free users (matches sidebar) */}
        {canShowRadar && (
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/radar")}>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Radar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Niche Radar</span>
            </div>
            {loadingRadar ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <span className="text-xl font-bold">{radarStats?.recentCount ?? 0}</span>
            )}
            <p className="text-xs text-muted-foreground">signals this week</p>
          </CardContent>
        </Card>
        )}

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
              <span className="text-xl font-bold">{workspaceStats?.totalDocs ?? 0}</span>
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
        <Card>
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
        <Button variant="outline" className="gap-2" onClick={() => {
          if (!canCompare) {
            setPaywallReason("COMPARE_REQUIRES_PRO");
          } else {
            navigate("/ideas/compare");
          }
        }}>
          {!canCompare && <Lock className="h-3 w-3" />}
          <Scale className="h-4 w-4" />
          Compare Ideas
        </Button>
      </div>

      {paywallReason && (
        <ProUpgradeModal
          open={!!paywallReason}
          onClose={() => setPaywallReason(null)}
          reasonCode={paywallReason as any}
        />
      )}
    </div>
  );
}
