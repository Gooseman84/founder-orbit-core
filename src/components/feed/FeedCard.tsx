import { formatDistanceToNow } from "date-fns";
import { Lightbulb, Wrench, Radar, CheckSquare } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  };
  onClick?: (item: FeedCardProps["item"]) => void;
}

// Type-specific configurations
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
} as const;

export function FeedCard({ item, onClick }: FeedCardProps) {
  const { user } = useAuth();
  const { refresh: refreshXp } = useXP();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const config = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.insight;
  const Icon = config.icon;

  const handleCtaClick = async () => {
    if (!user || isProcessing) return;

    setIsProcessing(true);

    try {
      // Special handling for micro_task type
      if (item.type === "micro_task") {
        // Check if this is an outlining action
        const isOutliningAction = 
          item.cta_action === "start_outlining" || 
          (item.cta_label && item.cta_label.toLowerCase().includes("start outlining"));

        if (isOutliningAction) {
          // Handle workspace document creation/navigation
          // 1. Check if workspace document already exists
          const { data: existingDoc, error: checkError } = await supabase
            .from("workspace_documents")
            .select("id")
            .eq("user_id", user.id)
            .eq("source_type", "feed")
            .eq("source_id", item.id)
            .maybeSingle();

          if (checkError) {
            console.error("Error checking for existing workspace document:", checkError);
            throw new Error("Failed to check for existing document");
          }

          if (existingDoc) {
            // Document already exists, navigate to it
            await recordXpEvent(user.id, "workspace_opened", 10, {
              source: "feed",
              feedItemId: item.id,
            });
            refreshXp();
            toast.success("Opening your workspace document! (+10 XP)");
            navigate(`/workspace/${existingDoc.id}`);
            setIsProcessing(false);
            return;
          }

          // 2. Fetch chosen idea if available
          const { data: chosenIdea } = await supabase
            .from("ideas")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "chosen")
            .maybeSingle();

          // 3. Create new workspace document
          const { data: newDoc, error: insertError } = await supabase
            .from("workspace_documents")
            .insert({
              user_id: user.id,
              idea_id: chosenIdea?.id || null,
              source_type: "feed",
              source_id: item.id,
              doc_type: "outline",
              title: item.title,
              content: item.body, // Include feed item body as starter content
              status: "draft",
            })
            .select()
            .single();

          if (insertError) {
            console.error("Error creating workspace document:", insertError);
            throw new Error("Failed to create workspace document");
          }

          // 4. Award XP for opening workspace
          await recordXpEvent(user.id, "workspace_opened", 10, {
            source: "feed",
            feedItemId: item.id,
          });
          refreshXp();

          toast.success("Workspace document created! (+10 XP)");
          navigate(`/workspace/${newDoc.id}`);
          setIsProcessing(false);
          return;
        }

        // Default micro_task handling (create task)
        // Check if task already exists for this feed_item_id
        const { data: existingTask, error: checkError } = await supabase
          .from("tasks")
          .select("id")
          .eq("feed_item_id", item.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (checkError) {
          console.error("Error checking for existing task:", checkError);
          throw new Error("Failed to check for existing task");
        }

        if (existingTask) {
          toast.info("This task already exists in your task list!");
          navigate("/tasks");
          setIsProcessing(false);
          return;
        }

        // Insert new task
        const { error: insertError } = await supabase
          .from("tasks")
          .insert({
            user_id: user.id,
            feed_item_id: item.id,
            type: "micro",
            title: item.title,
            description: item.body,
            xp_reward: item.xp_reward || 10,
            status: "pending",
          });

        if (insertError) {
          console.error("Error inserting task:", insertError);
          throw new Error("Failed to create task");
        }

        // Award XP for adding task to list
        const xpAmount = 5; // Small XP reward for accepting a task
        await recordXpEvent(user.id, "task_added", xpAmount, {
          feedItemId: item.id,
          taskTitle: item.title,
        });

        // Refresh XP display
        refreshXp();

        toast.success(`Task added to your list! (+${xpAmount} XP)`);
        navigate("/tasks");
      } else {
        // Default handling for other feed item types
        const xpAmount = item.xp_reward ?? 2;
        await recordXpEvent(user.id, "feed_interaction", xpAmount, {
          feedItemId: item.id,
          feedItemType: item.type,
        });

        // Refresh XP display
        refreshXp();
        
        toast.success(`+${xpAmount} XP earned!`);

        // Call parent onClick handler
        if (onClick) {
          onClick(item);
        }
      }
    } catch (error) {
      console.error("Error handling CTA click:", error);
      toast.error("Something went wrong. Please try again.");
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

      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {item.body}
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-3 border-t">
        {formattedTime && (
          <span className="text-xs text-muted-foreground">
            {formattedTime}
          </span>
        )}
        {item.cta_label && (
          <Button
            onClick={handleCtaClick}
            size="sm"
            variant="outline"
            className="ml-auto"
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : item.cta_label}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
