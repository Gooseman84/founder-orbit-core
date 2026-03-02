import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { NPSPrompt } from "@/components/feedback/NPSPrompt";

interface MavrikAssessmentCardProps {
  ventureId: string;
}

type RecommendationAction = "persist" | "double_down" | "pivot" | "pause";

const RECOMMENDATION_MAP: Record<RecommendationAction, { label: string; className: string }> = {
  persist: { label: "STAY THE COURSE", className: "border-primary/35 text-primary bg-primary/10" },
  double_down: { label: "DOUBLE DOWN", className: "border-success/35 text-success bg-success/10" },
  pivot: { label: "CONSIDER A PIVOT", className: "border-destructive/35 text-destructive bg-destructive/10" },
  pause: { label: "GATHER MORE SIGNAL", className: "border-border text-muted-foreground bg-transparent" },
};

function parseRecommendation(raw: string | null) {
  if (!raw) return null;
  const colonIdx = raw.indexOf(":");
  if (colonIdx === -1) return { action: raw.trim().toLowerCase() as RecommendationAction, rationale: "" };
  return {
    action: raw.slice(0, colonIdx).trim().toLowerCase() as RecommendationAction,
    rationale: raw.slice(colonIdx + 1).trim(),
  };
}

export function MavrikAssessmentCard({ ventureId }: MavrikAssessmentCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [showNPS, setShowNPS] = useState(false);
  const npsCheckedRef = useRef(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["mavrik-assessment", ventureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validation_summaries")
        .select("*")
        .eq("venture_id", ventureId)
        .eq("user_id", user!.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!ventureId,
  });

  const { data: evidenceCount } = useQuery({
    queryKey: ["mavrik-evidence-count", ventureId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("validation_evidence")
        .select("*", { count: "exact", head: true })
        .eq("venture_id", ventureId)
        .eq("user_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user && !!ventureId,
  });

  useEffect(() => {
    if (!summary || !user || npsCheckedRef.current) return;
    npsCheckedRef.current = true;
    const checkNPS = async () => {
      const { count } = await supabase
        .from("beta_feedback")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("feedback_type", "nps");
      if ((count ?? 0) === 0) {
        setTimeout(() => setShowNPS(true), 3000);
      }
    };
    checkNPS();
  }, [summary, user]);

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      const { data: session } = await supabase
        .from("validation_sessions")
        .select("id")
        .eq("venture_id", ventureId)
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!session?.id) return;
      await invokeAuthedFunction("analyze-validation-session", {
        body: { session_id: session.id, venture_id: ventureId },
      });
      queryClient.invalidateQueries({ queryKey: ["mavrik-assessment", ventureId] });
      queryClient.invalidateQueries({ queryKey: ["mavrik-evidence-count", ventureId] });
    } catch (err) {
      console.error("Re-analysis failed:", err);
    } finally {
      setIsReanalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="border border-border bg-card mb-6">
        <div className="px-6 py-4 border-b border-border">
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="p-6 space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const rec = parseRecommendation(summary.recommendation);
  const recConfig = rec ? RECOMMENDATION_MAP[rec.action] : null;

  return (
    <>
      <div className="border border-border bg-card mb-6">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <span className="label-mono-gold">MAVRIK'S ASSESSMENT</span>
            {evidenceCount != null && (
              <p className="label-mono mt-0.5">
                BASED ON {evidenceCount} EVIDENCE {evidenceCount === 1 ? "ENTRY" : "ENTRIES"}
              </p>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Pattern Summary */}
          {summary.pattern_summary && (
            <div>
              <span className="label-mono block mb-1">WHAT THE EVIDENCE SHOWS</span>
              <p className="text-sm font-light text-foreground/80 leading-relaxed">
                {summary.pattern_summary}
              </p>
            </div>
          )}

          {/* Advisor Note */}
          {summary.advisor_note && (
            <div className="border-l-4 border-primary bg-primary/5 p-5">
              <span className="label-mono block mb-1">MAVRIK'S TAKE</span>
              <p className="text-sm font-light text-foreground leading-relaxed">
                {summary.advisor_note}
              </p>
            </div>
          )}

          {/* Recommendation Badge */}
          {rec && recConfig && (
            <div>
              <span className={`font-mono-tb text-[0.62rem] uppercase tracking-wider border px-2.5 py-1 ${recConfig.className}`}>
                {recConfig.label}
              </span>
              {rec.rationale && (
                <p className="text-[0.82rem] font-light text-muted-foreground mt-1.5">{rec.rationale}</p>
              )}
            </div>
          )}

          {/* Evidence Breakdown */}
          {(summary.positive_count != null || summary.negative_count != null || summary.neutral_count != null) && (
            <div className="flex items-center gap-4">
              <span className="font-mono-tb text-[0.65rem] uppercase text-success">
                {summary.positive_count ?? 0} CONFIRMING
              </span>
              <span className="font-mono-tb text-[0.65rem] uppercase text-destructive">
                {summary.negative_count ?? 0} CHALLENGING
              </span>
              <span className="font-mono-tb text-[0.65rem] uppercase text-muted-foreground">
                {summary.neutral_count ?? 0} NEUTRAL
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="label-mono">
              {summary.generated_at ? format(new Date(summary.generated_at), "MMM d, yyyy").toUpperCase() : "—"}
            </span>
            <button
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className="flex items-center gap-1.5 label-mono hover:text-foreground transition-colors disabled:opacity-40"
            >
              {isReanalyzing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              RE-ANALYZE
            </button>
          </div>
        </div>
      </div>
      <NPSPrompt open={showNPS} onClose={() => setShowNPS(false)} />
    </>
  );
}
