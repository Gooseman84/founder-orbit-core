import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { NorthStarCard } from "./NorthStarCard";
import { VentureMilestoneTracker } from "./VentureMilestoneTracker";
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  BarChart3, 
  Crown, 
  Sparkles,
  Scale,
  Lock
} from "lucide-react";

const DASHBOARD_STALE_TIME = 3 * 60 * 1000;

export function DiscoveryDashboard() {
  const { user } = useAuth();
  const { plan } = useSubscription();
  const { hasPro, features } = useFeatureAccess();
  const navigate = useNavigate();
  const isFree = plan === "free";
  const [paywallReason, setPaywallReason] = useState<string | null>(null);

  const canCompare = features.canCompareIdeas;

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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="eyebrow mb-3">YOUR LAUNCHPAD</div>
        <h1 className="font-display text-[1.75rem] sm:text-[2.5rem] font-bold leading-tight text-foreground">
          Find Your <em className="text-primary not-italic" style={{ fontStyle: "italic" }}>North Star</em>
        </h1>
        <p className="mt-2 text-[0.95rem] font-light text-muted-foreground">
          Explore ideas and discover your next venture.
        </p>
      </div>

      {/* Pro Upgrade CTA */}
      {isFree && (
        <div className="card-gold-accent p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Unlock TrueBlazer Pro</span>
          </div>
          <UpgradeButton variant="full" />
        </div>
      )}

      {/* Milestone Progress */}
      <VentureMilestoneTracker />

      {/* North Star Card */}
      <NorthStarCard />

      {/* Stat Grid — workspace + top score */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2">
        <div
          className="card-gold-accent p-4 sm:p-5 cursor-pointer transition-colors hover:bg-secondary"
          onClick={() => navigate("/workspace")}
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            <span className="label-mono">Workspace</span>
          </div>
          {loadingWorkspace ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <span className="font-display text-[2rem] font-bold text-foreground">{workspaceStats?.totalDocs ?? 0}</span>
          )}
          <p className="text-xs text-muted-foreground mt-1">documents</p>
        </div>

        <div
          className="card-gold-accent p-4 sm:p-5 cursor-pointer transition-colors hover:bg-secondary"
          onClick={() => navigate("/ideas")}
        >
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="label-mono">Top Score</span>
          </div>
          {loadingScore ? (
            <Skeleton className="h-8 w-16" />
          ) : highestScore ? (
            <span className="font-display text-[2rem] sm:text-[2.5rem] font-bold text-primary">{highestScore.total_score}</span>
          ) : (
            <span className="font-display text-[2rem] font-bold text-muted-foreground">—</span>
          )}
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {highestScore?.ideas?.title || "No scores yet"}
          </p>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <button
          className="py-3 px-6 bg-primary text-primary-foreground font-sans font-medium text-[0.85rem] tracking-[0.06em] uppercase transition-colors hover:brightness-110 flex items-center justify-center gap-2"
          onClick={() => navigate("/ideas")}
        >
          <Sparkles className="h-4 w-4" />
          Explore Ideas
        </button>
        <button
          className="py-3 px-6 border border-border text-foreground font-sans font-medium text-[0.85rem] tracking-[0.06em] uppercase transition-colors hover:bg-secondary flex items-center justify-center gap-2"
          onClick={() => {
            if (!canCompare) {
              setPaywallReason("COMPARE_REQUIRES_PRO");
            } else {
              navigate("/ideas/compare");
            }
          }}
        >
          {!canCompare && <Lock className="h-3 w-3" />}
          <Scale className="h-4 w-4" />
          Compare Ideas
        </button>
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
