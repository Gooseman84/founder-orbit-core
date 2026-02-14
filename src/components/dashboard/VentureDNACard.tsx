import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronUp, ChevronDown, Target, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
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
  // If stored date is today, user collapsed it today → stay collapsed
  return stored !== today;
}

export function VentureDNACard({ venture, commitmentProgress }: VentureDNACardProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(getDefaultExpanded);

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (!next) {
      // User collapsed → remember for today
      localStorage.setItem(COLLAPSE_KEY, new Date().toISOString().split("T")[0]);
    } else {
      localStorage.removeItem(COLLAPSE_KEY);
    }
  };

  // Fetch idea data for one-liner / description
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

  // Fetch motivational anchor from founder profile
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
      // Priority: entry_trigger → future_vision → success_vision
      const quote = data.entry_trigger || data.future_vision || data.success_vision;
      return quote && typeof quote === 'string' ? quote : null;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const oneLiner = ideaData?.description || ideaData?.title || null;
  const isOverCommitment = commitmentProgress && commitmentProgress.currentDay > commitmentProgress.totalDays;
  const progressPercent = commitmentProgress
    ? Math.min(100, commitmentProgress.progressPercent)
    : 0;

  const successMetric = venture.success_metric
    || `Complete your ${venture.commitment_window_days ?? 30}-day plan`;

  const fallbackQuote = "You committed to this venture because you saw an opportunity others missed.";
  const displayQuote = motivationalQuote || fallbackQuote;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 relative overflow-hidden">
      {/* Subtle gradient accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

      <CardContent className="py-5 px-5">
        {/* Always visible: Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Target className="h-5 w-5 text-primary shrink-0" />
            <h2 className="text-lg font-bold truncate">{venture.name}</h2>
          </div>
          <button
            onClick={handleToggle}
            className="p-1.5 rounded-md hover:bg-secondary/60 transition-colors text-muted-foreground shrink-0"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Always visible: Progress bar */}
        {commitmentProgress && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">
                {isOverCommitment ? (
                  <>Day {commitmentProgress.currentDay} of {commitmentProgress.totalDays} — Beyond commitment! <Flame className="inline h-3 w-3 text-primary" /></>
                ) : (
                  <>Day {commitmentProgress.currentDay} of {commitmentProgress.totalDays}</>
                )}
              </span>
              <span className="text-muted-foreground">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* One-liner */}
            {oneLiner && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                {oneLiner}
              </p>
            )}

            {/* Success metric */}
            <div className="bg-secondary/40 rounded-lg px-3.5 py-2.5">
              <p className="text-[11px] uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">
                Your goal
              </p>
              <p className="text-sm font-medium text-foreground">{successMetric}</p>
            </div>

            {/* Motivational anchor */}
            <div className="border-l-2 border-primary/30 pl-3">
              <p className="text-xs italic text-muted-foreground leading-relaxed">
                "{displayQuote}"
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
