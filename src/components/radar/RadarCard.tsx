import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle, ArrowUpRight, Users, Zap, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { recordXpEvent } from "@/lib/xpEngine";
import { toast } from "sonner";

interface RadarSignal {
  id: string;
  idea_id?: string | null;
  signal_type: string;
  title: string;
  description: string;
  priority_score: number;
  recommended_action: string;
  metadata?: {
    why_now?: string | null;
    relevance_to_idea?: string | null;
    risk_level?: "low" | "medium" | "high" | null;
    v6_triggers?: string[] | null;
    [key: string]: any;
  } | null;
}

interface RadarCardProps {
  signal: RadarSignal;
}

const signalTypeConfig = {
  trend: {
    icon: TrendingUp,
    label: "Trend",
    bgClass: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  problem: {
    icon: AlertCircle,
    label: "Problem",
    bgClass: "bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20",
    badgeClass: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  market_shift: {
    icon: ArrowUpRight,
    label: "Market Shift",
    bgClass: "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  consumer_behavior: {
    icon: Users,
    label: "Consumer Behavior",
    bgClass: "bg-green-500/10 hover:bg-green-500/20 border-green-500/20",
    badgeClass: "bg-green-500/10 text-green-700 dark:text-green-300",
  },
  tech_tailwind: {
    icon: Zap,
    label: "Tech Tailwind",
    bgClass: "bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20",
    badgeClass: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  },
  platform_trend: {
    icon: TrendingUp,
    label: "Platform Trend",
    bgClass: "bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/20",
    badgeClass: "bg-pink-500/10 text-pink-700 dark:text-pink-300",
  },
  meme_format: {
    icon: Zap,
    label: "Meme Format",
    bgClass: "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20",
    badgeClass: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  creator_monetization_shift: {
    icon: ArrowUpRight,
    label: "Creator Monetization",
    bgClass: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  automation_tailwind: {
    icon: Zap,
    label: "Automation Tailwind",
    bgClass: "bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20",
    badgeClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
};

const getRiskBadgeClass = (risk: string | null | undefined) => {
  switch (risk) {
    case "low": return "bg-green-500/10 text-green-700 dark:text-green-300";
    case "high": return "bg-red-500/10 text-red-700 dark:text-red-300";
    default: return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
  }
};

const getPriorityColor = (score: number) => {
  if (score >= 80) return "text-red-600 dark:text-red-400";
  if (score >= 60) return "text-orange-600 dark:text-orange-400";
  if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
};

const getPriorityLabel = (score: number) => {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
};

export function RadarCard({ signal }: RadarCardProps) {
  const { user } = useAuth();
  const { refresh: refreshXp } = useXP();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const config = signalTypeConfig[signal.signal_type as keyof typeof signalTypeConfig] || signalTypeConfig.trend;
  const Icon = config.icon;

  const handleCreateTask = async () => {
    if (!user || isCreating) return;

    setIsCreating(true);

    try {
      // Check if task already exists for this radar signal
      const { data: existingTask, error: checkError } = await supabase
        .from("tasks")
        .select("id")
        .eq("metadata->>radar_origin", signal.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking for existing task:", checkError);
        throw new Error("Failed to check for existing task");
      }

      if (existingTask) {
        toast.info("Task already exists for this signal!");
        navigate("/tasks");
        return;
      }

      // Fetch chosen idea if signal doesn't have idea_id
      let ideaId = signal.idea_id;
      if (!ideaId) {
        const { data: chosenIdea, error: ideaError } = await supabase
          .from("ideas")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "chosen")
          .maybeSingle();

        if (ideaError) {
          console.error("Error fetching chosen idea:", ideaError);
        }
        ideaId = chosenIdea?.id || null;
      }

      // Insert new quest task from radar signal
      const { error: insertError } = await supabase.from("tasks").insert({
        user_id: user.id,
        idea_id: ideaId,
        type: "quest",
        title: signal.title,
        description: signal.recommended_action,
        xp_reward: 20,
        status: "pending",
        metadata: {
          radar_origin: signal.id,
        },
      });

      if (insertError) {
        console.error("Error inserting task:", insertError);
        throw new Error("Failed to create task");
      }

      // Award XP for taking action on radar signal
      await recordXpEvent(user.id, "radar_action", 20, {
        signalId: signal.id,
      });

      refreshXp();
      toast.success("Quest created from radar signal! (+20 XP)");
      navigate("/tasks");
    } catch (error) {
      console.error("Error creating task from radar signal:", error);
      toast.error("Failed to create task");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className={`transition-colors ${config.bgClass}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={config.badgeClass}>
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            <Badge variant="outline" className={getPriorityColor(signal.priority_score)}>
              {getPriorityLabel(signal.priority_score)} ({signal.priority_score})
            </Badge>
          </div>
        </div>
        <CardTitle className="text-lg mt-2">{signal.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-sm leading-relaxed">
          {signal.description}
        </CardDescription>

        {/* V6: Why Now */}
        {signal.metadata?.why_now && (
          <div className="rounded-md bg-muted/50 p-3 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-1">Why Now?</p>
            <p className="text-sm">{signal.metadata.why_now}</p>
          </div>
        )}

        {/* V6: Relevance to Idea */}
        {signal.metadata?.relevance_to_idea && (
          <div className="rounded-md bg-primary/5 p-3 border border-primary/20">
            <p className="text-xs font-medium text-primary mb-1">Relevance to Your Idea</p>
            <p className="text-sm">{signal.metadata.relevance_to_idea}</p>
          </div>
        )}

        {/* V6: Risk Level Badge */}
        {signal.metadata?.risk_level && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Risk:</span>
            <Badge variant="outline" className={getRiskBadgeClass(signal.metadata.risk_level)}>
              {signal.metadata.risk_level.charAt(0).toUpperCase() + signal.metadata.risk_level.slice(1)}
            </Badge>
          </div>
        )}

        <div className="rounded-md bg-muted/50 p-3 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Action:</p>
          <p className="text-sm">{signal.recommended_action}</p>
        </div>

        <Button
          onClick={handleCreateTask}
          variant="outline"
          size="sm"
          className="w-full"
          disabled={isCreating}
        >
          <Plus className="h-4 w-4 mr-2" />
          {isCreating ? "Creating..." : "Create Task"}
        </Button>
      </CardContent>
    </Card>
  );
}
