import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { ChevronUp, ChevronDown, Target, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Venture } from "@/types/venture";

interface VentureDNACardProps {
  venture: Venture;
  commitmentProgress: {
    currentDay: number;
    totalDays: number;
    daysRemaining: number;
    isComplete: boolean;
    progressPercent: number;
  } | null;
}

const COLLAPSE_KEY = "tb-venture-dna-collapsed-date";

function getDefaultExpanded(): boolean {
  const stored = localStorage.getItem(COLLAPSE_KEY);
  if (!stored) return true;
  const today = new Date().toISOString().split("T")[0];
  return stored !== today;
}

export function VentureDNACard({ venture, commitmentProgress }: VentureDNACardProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(getDefaultExpanded);

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (!next) {
      localStorage.setItem(COLLAPSE_KEY, new Date().toISOString().split("T")[0]);
    } else {
      localStorage.removeItem(COLLAPSE_KEY);
    }
  };

  const { data: ideaData } = useQuery({
    queryKey: ["venture-dna-idea", venture.idea_id],
    queryFn: async () => {
      if (!venture.idea_id || !user) return null;
      const { data } = await supabase
        .from("ideas")
        .select("title, description")
        .eq("id", venture.idea_id)
        .maybeSingle();
      return data;
    },
    enabled: !!venture.idea_id && !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: motivationalQuote } = useQuery({
    queryKey: ["venture-dna-motivation", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("founder_profiles")
        .select("entry_trigger, future_vision, success_vision")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) return null;
      const quote = data.entry_trigger || data.future_vision || data.success_vision;
      return quote && typeof quote === "string" ? quote : null;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const oneLiner = ideaData?.description || ideaData?.title || null;
  const isOverCommitment = commitmentProgress && commitmentProgress.currentDay > commitmentProgress.totalDays;
  const progressPercent = commitmentProgress ? Math.min(100, commitmentProgress.progressPercent) : 0;
  const successMetric = venture.success_metric || `Complete your ${venture.commitment_window_days ?? 30}-day plan`;
  const fallbackQuote = "You committed to this venture because you saw an opportunity others missed.";
  const displayQuote = motivationalQuote || fallbackQuote;

  return (
    <div className="card-gold-accent p-5 relative overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Target className="h-5 w-5 text-primary shrink-0" />
          <h2 className="font-display text-lg font-bold truncate text-foreground">{venture.name}</h2>
        </div>
        <button
          onClick={handleToggle}
          className="p-1.5 hover:bg-secondary transition-colors text-muted-foreground shrink-0"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Progress bar */}
      {commitmentProgress && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="label-mono">
              {isOverCommitment ? (
                <>Day {commitmentProgress.currentDay} of {commitmentProgress.totalDays} — Beyond commitment! <Flame className="inline h-3 w-3 text-primary" /></>
              ) : (
                <>Day {commitmentProgress.currentDay} of {commitmentProgress.totalDays}</>
              )}
            </span>
            <span className="label-mono">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="mt-4 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {oneLiner && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{oneLiner}</p>
          )}

          <div className="bg-secondary p-4">
            <span className="label-mono-gold block mb-1">Your Goal</span>
            <p className="text-sm font-medium text-foreground">{successMetric}</p>
          </div>

          <div className="border-l-2 border-primary/30 pl-3">
            <p className="text-xs italic text-muted-foreground leading-relaxed">"{displayQuote}"</p>
          </div>
        </div>
      )}
    </div>
  );
}
