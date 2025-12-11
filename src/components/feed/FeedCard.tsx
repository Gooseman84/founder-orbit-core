import { formatDistanceToNow } from "date-fns";
import { Lightbulb, Wrench, Radar, CheckSquare, Zap, TrendingUp, Sparkles, Flame, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { recordXpEvent } from "@/lib/xpEngine";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";

interface FeedCardProps {
  item: {
    id: string;
    type: string;
    title: string;
    body: string;
    cta_label?: string | null;
    cta_action?: string | null;
    xp_reward?: number | null;
    created_at?: string;
    metadata?: {
      strategy_reasoning?: string | null;
      v6_triggers?: string[] | null;
      [key: string]: any;
    } | null;
  };
  onClick?: (item: FeedCardProps["item"]) => void;
}

// Type-specific configurations - extended for v6
const TYPE_CONFIG = {
  insight: {
    label: "INSIGHT",
    icon: Lightbulb,
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  idea_tweak: {
    label: "TWEAK",
    icon: Wrench,
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    iconClass: "text-purple-600 dark:text-purple-400",
  },
  competitor_snapshot: {
    label: "COMPETITOR",
    icon: Radar,
    badgeClass: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    iconClass: "text-yellow-600 dark:text-yellow-400",
  },
  micro_task: {
    label: "MICRO TASK",
    icon: CheckSquare,
    badgeClass: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    iconClass: "text-green-600 dark:text-green-400",
  },
  viral_experiment: {
    label: "VIRAL TEST",
    icon: TrendingUp,
    badgeClass: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
    iconClass: "text-pink-600 dark:text-pink-400",
  },
  money_system_upgrade: {
    label: "SYSTEM",
    icon: Zap,
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  memetic_play: {
    label: "MEME",
    icon: Sparkles,
    badgeClass: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
    iconClass: "text-cyan-600 dark:text-cyan-400",
  },
  chaos_variant: {
    label: "CHAOS",
    icon: Flame,
    badgeClass: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    iconClass: "text-red-600 dark:text-red-400",
  },
} as const;

export function FeedCard({ item, onClick }: FeedCardProps) {
  const { user } = useAuth();
  const { refresh: refreshXp } = useXP();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const config = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.insight;
  const Icon = config.icon;

  const strategyReasoning = item.metadata?.strategy_reasoning;
  const v6Triggers = item.metadata?.v6_triggers;

  const handleCtaClick = async () => {
    if (!user || isProcessing) return;
    setIsProcessing(true);

    try {
      if (item.type === "micro_task") {
        const { data: existingTask } = await supabase
          .from("tasks")
          .select("id")
          .eq("feed_item_id", item.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingTask) {
          toast.info("This task already exists!");
          navigate("/tasks");
          setIsProcessing(false);
          return;
        }

        await supabase.from("tasks").insert({
          user_id: user.id,
          feed_item_id: item.id,
          type: "micro",
          title: item.title,
          description: item.body,
          xp_reward: item.xp_reward || 10,
          status: "pending",
        });

        await recordXpEvent(user.id, "task_added", 5, { feedItemId: item.id });
        refreshXp();
        toast.success("Task added! (+5 XP)");
        navigate("/tasks");
      } else {
        const xpAmount = item.xp_reward ?? 2;
        await recordXpEvent(user.id, "feed_interaction", xpAmount, {
          feedItemId: item.id,
          feedItemType: item.type,
        });
        refreshXp();
        toast.success(`+${xpAmount} XP earned!`);
        if (onClick) onClick(item);
      }
    } catch (error) {
      console.error("Error handling CTA:", error);
      toast.error("Something went wrong.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formattedTime = item.created_at
    ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
    : null;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${config.iconClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <Badge variant="outline" className={`${config.badgeClass} font-medium`}>
                {config.label}
              </Badge>
              <h3 className="font-semibold text-foreground leading-tight mt-2">
                {item.title}
              </h3>
            </div>
          </div>
          {item.xp_reward && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 shrink-0">
              +{item.xp_reward} XP
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
        
        {/* V6 Strategy Reasoning */}
        {strategyReasoning && (
          <Collapsible open={isReasoningOpen} onOpenChange={setIsReasoningOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Why this suggestion?
                </span>
                {isReasoningOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                <p>{strategyReasoning}</p>
                {v6Triggers && v6Triggers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {v6Triggers.map((trigger, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{trigger}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-3 border-t">
        {formattedTime && <span className="text-xs text-muted-foreground">{formattedTime}</span>}
        {item.cta_label && (
          <Button onClick={handleCtaClick} size="sm" variant="outline" className="ml-auto" disabled={isProcessing}>
            {isProcessing ? "Processing..." : item.cta_label}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
