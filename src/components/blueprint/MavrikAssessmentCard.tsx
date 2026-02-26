import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { NPSPrompt } from "@/components/feedback/NPSPrompt";

interface MavrikAssessmentCardProps {
  ventureId: string;
}

type RecommendationAction = "persist" | "double_down" | "pivot" | "pause";

const RECOMMENDATION_MAP: Record<RecommendationAction, { label: string; className: string }> = {
  persist: { label: "Stay the Course", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  double_down: { label: "Double Down", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  pivot: { label: "Consider a Pivot", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  pause: { label: "Gather More Signal", className: "bg-muted text-muted-foreground border-border" },
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

  // NPS trigger: check once after summary loads successfully
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
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-32 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-8 w-40" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const rec = parseRecommendation(summary.recommendation);
  const recConfig = rec ? RECOMMENDATION_MAP[rec.action] : null;

  return (
    <>
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Mavrik's Assessment</CardTitle>
            {evidenceCount != null && (
              <p className="text-xs text-muted-foreground">
                Based on {evidenceCount} evidence {evidenceCount === 1 ? "entry" : "entries"}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Pattern Summary */}
        {summary.pattern_summary && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              What the evidence shows
            </p>
            <p className="text-sm text-card-foreground/80 leading-relaxed">
              {summary.pattern_summary}
            </p>
          </div>
        )}

        {/* Advisor Note — most prominent */}
        {summary.advisor_note && (
          <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Mavrik's take
            </p>
            <p className="text-sm text-card-foreground leading-relaxed">
              {summary.advisor_note}
            </p>
          </div>
        )}

        {/* Recommendation Badge */}
        {rec && recConfig && (
          <div>
            <Badge className={cn("text-sm px-3 py-1 border", recConfig.className)}>
              {recConfig.label}
            </Badge>
            {rec.rationale && (
              <p className="text-xs text-muted-foreground mt-1.5">{rec.rationale}</p>
            )}
          </div>
        )}

        {/* Evidence Breakdown */}
        {(summary.positive_count != null || summary.negative_count != null || summary.neutral_count != null) && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-emerald-400 font-medium">
              {summary.positive_count ?? 0} Confirming
            </span>
            <span className="text-destructive font-medium">
              {summary.negative_count ?? 0} Challenging
            </span>
            <span className="text-muted-foreground font-medium">
              {summary.neutral_count ?? 0} Neutral
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Assessment generated {summary.generated_at ? format(new Date(summary.generated_at), "MMM d, yyyy") : "—"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5"
            onClick={handleReanalyze}
            disabled={isReanalyzing}
          >
            {isReanalyzing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Re-analyze
          </Button>
        </div>
      </CardContent>
    </Card>
    <NPSPrompt open={showNPS} onClose={() => setShowNPS(false)} />
    </>
  );
}
