import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Info, CircleDot, X, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FounderPatternCardProps {
  ventureId: string;
}

const SEVERITY_CONFIG: Record<string, { icon: React.ReactNode; border: string }> = {
  high: {
    icon: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
    border: "border-amber-500/30",
  },
  medium: {
    icon: <Info className="h-4 w-4 text-blue-400 shrink-0" />,
    border: "border-blue-400/30",
  },
  low: {
    icon: <CircleDot className="h-4 w-4 text-muted-foreground shrink-0" />,
    border: "border-border",
  },
};

const PATTERN_LABELS: Record<string, string> = {
  assumption_rationalization: "Pattern Detected: Assumption Rationalization",
  pivot_hesitation: "Pattern Detected: Pivot Hesitation",
  validation_avoidance: "Pattern Detected: Validation Avoidance",
  niche_drift: "Pattern Detected: Niche Drift",
  over_optimization: "Pattern Detected: Over-Optimization",
};

export function FounderPatternCard({ ventureId }: FounderPatternCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());

  const { data: patterns, isLoading } = useQuery({
    queryKey: ["founder-patterns", ventureId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("founder_patterns")
        .select("*")
        .eq("venture_id", ventureId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Sort high → medium → low
      const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (data ?? []).sort(
        (a: any, b: any) =>
          (severityOrder[a.severity ?? "low"] ?? 2) - (severityOrder[b.severity ?? "low"] ?? 2)
      );
    },
    enabled: !!user && !!ventureId,
    staleTime: 60_000,
  });

  const handleDismiss = async (patternId: string) => {
    setDismissingIds((prev) => new Set(prev).add(patternId));
    // Optimistic removal
    queryClient.setQueryData(
      ["founder-patterns", ventureId, user?.id],
      (old: any[] | undefined) => (old ?? []).filter((p: any) => p.id !== patternId)
    );
    await supabase
      .from("founder_patterns")
      .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
      .eq("id", patternId)
      .eq("user_id", user!.id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!patterns || patterns.length === 0) return null;

  return (
    <div className="space-y-3">
      {patterns.map((pattern: any) => {
        const severity = SEVERITY_CONFIG[pattern.severity ?? "low"] ?? SEVERITY_CONFIG.low;
        const label = PATTERN_LABELS[pattern.pattern_type] ?? `Pattern Detected: ${pattern.pattern_type}`;

        return (
          <Card key={pattern.id} className={severity.border}>
            <CardContent className="py-4 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2">
                {severity.icon}
                <span className="text-sm font-semibold flex-1 min-w-0 truncate">{label}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => handleDismiss(pattern.id)}
                  disabled={dismissingIds.has(pattern.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground">{pattern.pattern_description}</p>

              {/* Advisor note */}
              <div className="border-l-2 border-primary/40 pl-3 py-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-[11px] font-medium text-primary">Mavrik's observation</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{pattern.advisor_note}</p>
              </div>

              {/* Footer */}
              <p className="text-[11px] text-muted-foreground/70">
                Detected {formatDistanceToNow(new Date(pattern.created_at), { addSuffix: true })}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
