import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Shield, TrendingUp, Plus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const FVS_DIMENSIONS = [
  { key: "market_demand", label: "Market" },
  { key: "revenue_potential", label: "Revenue" },
  { key: "feasibility", label: "Feasibility" },
  { key: "competitive_advantage", label: "Competitive" },
  { key: "scalability", label: "Scale" },
] as const;

const CONFIDENCE_LEVELS: Record<string, { label: string; order: number; cls: string }> = {
  assumption_based: { label: "Assumption", order: 0, cls: "text-muted-foreground" },
  early_signal: { label: "Early Signal", order: 1, cls: "text-primary" },
  partially_validated: { label: "Partial", order: 2, cls: "text-accent" },
  evidence_backed: { label: "Validated", order: 3, cls: "text-green-600" },
};

interface ValidationProgressCardProps {
  ventureId: string;
}

export function ValidationProgressCard({ ventureId }: ValidationProgressCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["validation-progress", ventureId, user?.id],
    enabled: !!user && !!ventureId,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const uid = user!.id;

      const [summaryRes, evidenceRes, missionsRes] = await Promise.all([
        supabase
          .from("validation_summaries")
          .select("confidence_shift, recommendation, total_evidence_count, positive_count, negative_count, neutral_count, advisor_note")
          .eq("venture_id", ventureId)
          .eq("user_id", uid)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("validation_evidence")
          .select("fvs_dimension, sentiment")
          .eq("venture_id", ventureId)
          .eq("user_id", uid),
        supabase
          .from("validation_missions")
          .select("id, mission_title, status, target_fvs_dimension")
          .eq("venture_id", ventureId)
          .eq("user_id", uid)
          .in("status", ["active", "pending"])
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      // Count evidence per FVS dimension
      const dimensionCounts: Record<string, { positive: number; negative: number; neutral: number; total: number }> = {};
      for (const dim of FVS_DIMENSIONS) {
        dimensionCounts[dim.key] = { positive: 0, negative: 0, neutral: 0, total: 0 };
      }
      if (evidenceRes.data) {
        for (const ev of evidenceRes.data) {
          const dim = ev.fvs_dimension;
          if (dim && dimensionCounts[dim]) {
            dimensionCounts[dim].total++;
            if (ev.sentiment === "positive") dimensionCounts[dim].positive++;
            else if (ev.sentiment === "negative") dimensionCounts[dim].negative++;
            else dimensionCounts[dim].neutral++;
          }
        }
      }

      return {
        summary: summaryRes.data,
        dimensionCounts,
        totalEvidence: evidenceRes.data?.length ?? 0,
        activeMissions: missionsRes.data ?? [],
      };
    },
  });

  if (isLoading) {
    return (
      <div className="card-gold-accent p-4 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  if (!data || data.totalEvidence === 0) {
    return (
      <div className="card-gold-accent p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="label-mono">Validation</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          No evidence logged yet. Start validating your assumptions to build conviction.
        </p>
        <button
          onClick={() => navigate(`/blueprint?ventureId=${ventureId}&tab=validation`)}
          className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Log Evidence
        </button>
      </div>
    );
  }

  const confidence = data.summary?.confidence_shift ?? "assumption_based";
  const conf = CONFIDENCE_LEVELS[confidence] ?? CONFIDENCE_LEVELS.assumption_based;

  return (
    <div className="card-gold-accent p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="label-mono">Validation Progress</span>
        </div>
        <span className={cn("text-[10px] font-mono px-2 py-0.5 border rounded-full", conf.cls)}>
          {conf.label}
        </span>
      </div>

      {/* Evidence count + sentiment */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <span className="text-foreground">{data.totalEvidence} evidence</span>
        {data.summary && (
          <>
            <span className="text-green-600">+{data.summary.positive_count ?? 0}</span>
            <span className="text-red-500">−{data.summary.negative_count ?? 0}</span>
            <span className="text-muted-foreground">~{data.summary.neutral_count ?? 0}</span>
          </>
        )}
      </div>

      {/* Dimension bars */}
      <div className="space-y-1.5">
        {FVS_DIMENSIONS.map((dim) => {
          const counts = data.dimensionCounts[dim.key];
          const maxBar = Math.max(data.totalEvidence, 5);
          const positiveW = (counts.positive / maxBar) * 100;
          const negativeW = (counts.negative / maxBar) * 100;
          const neutralW = (counts.neutral / maxBar) * 100;

          return (
            <div key={dim.key} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground w-20 shrink-0 truncate">
                {dim.label}
              </span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex">
                {positiveW > 0 && (
                  <div className="h-full bg-green-500 rounded-l-full" style={{ width: `${positiveW}%` }} />
                )}
                {neutralW > 0 && (
                  <div className="h-full bg-muted-foreground/30" style={{ width: `${neutralW}%` }} />
                )}
                {negativeW > 0 && (
                  <div className="h-full bg-red-400 rounded-r-full" style={{ width: `${negativeW}%` }} />
                )}
              </div>
              <span className="text-[10px] font-mono text-muted-foreground w-4 text-right">{counts.total}</span>
            </div>
          );
        })}
      </div>

      {/* Active Missions */}
      {data.activeMissions.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Active Missions</span>
          {data.activeMissions.map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-xs">
              <TrendingUp className="h-3 w-3 text-primary shrink-0" />
              <span className="text-foreground truncate">{m.mission_title}</span>
              {m.target_fvs_dimension && (
                <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                  {m.target_fvs_dimension}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Advisor note */}
      {data.summary?.advisor_note && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
          {data.summary.advisor_note}
        </p>
      )}

      {/* CTA */}
      <button
        onClick={() => navigate(`/blueprint?ventureId=${ventureId}&tab=validation`)}
        className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-0.5"
      >
        Log Evidence <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}
