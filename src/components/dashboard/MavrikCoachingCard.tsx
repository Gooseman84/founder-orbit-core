import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type MomentState =
  | "STUCK"
  | "BUILDING_MOMENTUM"
  | "SCOPE_CREEPING"
  | "EXECUTION_PARALYSIS"
  | "APPROACHING_LAUNCH";

interface Signals {
  recentCompletionRate: number;
  consecutiveNo: number;
  avgEnergy: number | null;
  hasBlockers: boolean;
  isApproachingEnd: boolean;
  hasDuplicateTasks: boolean;
}

interface MomentStateResponse {
  state: MomentState;
  signals: Signals;
  stateRationale: string;
  mavrikIntent: string;
}

interface CardContent {
  label: string;
  reframe: string;
  action: string;
  destination: "checkin" | "tasks" | "blueprint" | "workspace";
  borderClass: string;
  labelClass: string;
  actionClass: string;
}

function getCardContent(state: MomentState, signals: Signals): CardContent | null {
  if (state === "STUCK") {
    if (signals.consecutiveNo >= 2) {
      return {
        label: "Stalled",
        reframe: `You've marked the last ${signals.consecutiveNo} days incomplete. That's usually one specific thing blocking everything else.`,
        action: "Name the blocker in today's check-in →",
        destination: "checkin",
        borderClass: "border-l-amber-500",
        labelClass: "bg-amber-50 text-amber-700 border-amber-200",
        actionClass: "text-amber-600 hover:text-amber-700",
      };
    }
    return {
      label: "Blocked",
      reframe: "You've flagged a blocker and your completion rate has dropped. Unblocking one thing usually unsticks everything.",
      action: "Review today's tasks — which one clears the path? →",
      destination: "tasks",
      borderClass: "border-l-amber-500",
      labelClass: "bg-amber-50 text-amber-700 border-amber-200",
      actionClass: "text-amber-600 hover:text-amber-700",
    };
  }

  if (state === "EXECUTION_PARALYSIS") {
    if (signals.consecutiveNo >= 3) {
      return {
        label: "Paused",
        reframe: `Nothing's moved in ${signals.consecutiveNo} days. Forget the full task list — what's one thing you could finish in under an hour?`,
        action: "Start your smallest task →",
        destination: "tasks",
        borderClass: "border-l-red-400",
        labelClass: "bg-red-50 text-red-700 border-red-200",
        actionClass: "text-red-500 hover:text-red-600",
      };
    }
    return {
      label: "Low energy",
      reframe: "Your energy has been low and very little is getting done. Sometimes the right move is adjusting the plan, not pushing through it.",
      action: "Check in with Mavrik →",
      destination: "checkin",
      borderClass: "border-l-red-400",
      labelClass: "bg-red-50 text-red-700 border-red-200",
      actionClass: "text-red-500 hover:text-red-600",
    };
  }

  if (state === "SCOPE_CREEPING") {
    return {
      label: "Drifting",
      reframe: "You're completing tasks, but the same ones keep reappearing. Activity isn't the same as progress — are you working from the plan or around it?",
      action: "Review your Blueprint →",
      destination: "blueprint",
      borderClass: "border-l-amber-500",
      labelClass: "bg-amber-50 text-amber-700 border-amber-200",
      actionClass: "text-amber-600 hover:text-amber-700",
    };
  }

  if (state === "APPROACHING_LAUNCH") {
    return {
      label: "Launch window",
      reframe: "You're past 75% of your commitment window with solid execution. This is the phase where scope discipline matters most — only launch-critical work from here.",
      action: "Review your Launch Playbook →",
      destination: "workspace",
      borderClass: "border-l-primary",
      labelClass: "bg-primary/10 text-primary border-primary/30",
      actionClass: "text-primary hover:text-primary/80",
    };
  }

  return null;
}

interface MavrikCoachingCardProps {
  venture: { id: string };
}

export function MavrikCoachingCard({ venture }: MavrikCoachingCardProps) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const dismissKey = `mavrik-coaching-dismissed-${venture.id}-${today}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(dismissKey) === "1"; } catch { return false; }
  });

  const handleDismiss = () => {
    try { localStorage.setItem(dismissKey, "1"); } catch {}
    setDismissed(true);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["founder-moment-state", venture.id],
    queryFn: async () => {
      const { data, error } = await invokeAuthedFunction<MomentStateResponse>(
        "compute-founder-moment-state",
        { body: { ventureId: venture.id } }
      );
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!venture.id,
  });

  if (isLoading) {
    return (
      <div className="card-gold-accent p-4 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  if (dismissed) return null;
  if (!data?.state || data.state === "BUILDING_MOMENTUM" || !data.signals) return null;

  const content = getCardContent(data.state, data.signals);
  if (!content) return null;

  const handleAction = () => {
    if (content.destination === "checkin") {
      document.getElementById("todays-checkin")?.scrollIntoView({ behavior: "smooth" });
    } else if (content.destination === "tasks") {
      document.getElementById("todays-tasks")?.scrollIntoView({ behavior: "smooth" });
    } else if (content.destination === "blueprint") {
      navigate(`/blueprint?ventureId=${venture.id}`);
    } else {
      navigate("/workspace");
    }
  };

  return (
    <div className={cn("card-gold-accent border-l-2", content.borderClass)}>
      <button
        className="w-full flex items-center gap-2 p-4 text-left min-h-[44px]"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <span className={cn("text-[10px] font-mono px-2 py-0.5 border rounded-full shrink-0", content.labelClass)}>
          {content.label}
        </span>
        <span className="text-xs text-muted-foreground">Mavrik's read</span>
        {collapsed ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
        )}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-foreground leading-relaxed">{content.reframe}</p>
          <button
            onClick={handleAction}
            className={cn("text-sm font-medium", content.actionClass)}
          >
            {content.action}
          </button>
        </div>
      )}
    </div>
  );
}
