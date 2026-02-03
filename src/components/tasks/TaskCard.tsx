import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Zap, Target, Clock, CheckCircle2, Circle, PlayCircle, FileText, ChevronDown, Lightbulb } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { supabase } from "@/integrations/supabase/client";
import { recordXpEvent } from "@/lib/xpEngine";
import { toast } from "sonner";
import { EffortBadge, CategoryBadge } from "@/components/shared/CategoryBadge";

interface Task {
  id: string;
  type?: string | null;
  title: string;
  description?: string | null;
  xp_reward?: number | null;
  status?: string | null;
  created_at: string;
  completed_at?: string | null;
  category?: string | null;
  estimated_minutes?: number | null;
  idea_id?: string | null;
  metadata?: {
    doc_type?: string;
    workspace_enabled?: boolean;
    reason?: string;
    effort?: string;
    v6_triggers?: string[];
    [key: string]: any;
  } | null;
}

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onStart?: (taskId: string) => void;
  isCompleting?: boolean;
}

export function TaskCard({ task, onComplete, onStart, isCompleting = false }: TaskCardProps) {
  const { user } = useAuth();
  const { refresh: refreshXp } = useXP();
  const navigate = useNavigate();
  const [isWorkspaceProcessing, setIsWorkspaceProcessing] = useState(false);
  const [isReasonOpen, setIsReasonOpen] = useState(false);

  const isMicro = task.type === "micro";
  const isQuest = task.type === "quest";
  const isPending = task.status === "pending";
  const isInProgress = task.status === "in_progress";
  const isCompleted = task.status === "completed";

  // Check if task needs workspace integration
  const needsWorkspace = task.type === "micro" || task.type === "quest";
  
  // Extract v6 metadata
  const taskReason = task.metadata?.reason;
  const taskEffort = task.metadata?.effort;
  const taskCategory = task.category || task.metadata?.category;

  const handleCheckboxChange = (checked: boolean) => {
    if (checked && !isCompleted) {
      onComplete(task.id);
    }
  };

  const handleStartClick = () => {
    if (onStart && isPending) {
      onStart(task.id);
    }
  };

  const handleOpenWorkspace = async () => {
    if (!user || isWorkspaceProcessing) return;

    setIsWorkspaceProcessing(true);

    try {
      // 1. Check if workspace document already exists
      const { data: existingDoc, error: checkError } = await supabase
        .from("workspace_documents")
        .select("id")
        .eq("user_id", user.id)
        .eq("source_type", "task")
        .eq("source_id", task.id)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking for existing workspace document:", checkError);
        throw new Error("Failed to check for existing document");
      }

      if (existingDoc) {
        // 2. Document exists, navigate to it
        await recordXpEvent(user.id, "workspace_opened", 10, {
          source: "task",
          taskId: task.id,
        });
        refreshXp();
        toast.success(`Workspace ready for: ${task.title}`);
        navigate(`/workspace/${existingDoc.id}`);
        setIsWorkspaceProcessing(false);
        return;
      }

      // 3. Create new workspace document
      const { data: newDoc, error: insertError } = await supabase
        .from("workspace_documents")
        .insert({
          user_id: user.id,
          idea_id: task.idea_id || null,
          source_type: "task",
          source_id: task.id,
          linked_task_id: task.id,
          doc_type: "task-work",
          title: task.title,
          content: task.description || "",
          status: "draft",
          metadata: { taskId: task.id },
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating workspace document:", insertError);
        throw new Error("Failed to create workspace document");
      }

      // 4. Award XP and navigate
      await recordXpEvent(user.id, "workspace_opened", 10, {
        source: "task",
        taskId: task.id,
      });
      refreshXp();

      toast.success(`Workspace ready for: ${task.title}`);
      navigate(`/workspace/${newDoc.id}`);
    } catch (error) {
      console.error("Error opening workspace:", error);
      toast.error("Failed to open workspace. Please try again.");
    } finally {
      setIsWorkspaceProcessing(false);
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-all duration-200 hover:border-primary/30">
      <div className="flex items-start gap-3">
        {/* Checkbox for completion */}
        <div className="pt-1">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleCheckboxChange}
            disabled={isCompleted}
            className="h-5 w-5"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Type badge, category, effort, and status */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {/* Type Badge */}
            {isMicro && (
              <Badge variant="secondary" className="gap-1 text-xs font-semibold">
                <Zap className="h-3 w-3" />
                MICRO
              </Badge>
            )}
            {isQuest && (
              <Badge variant="default" className="gap-1 text-xs font-semibold">
                <Target className="h-3 w-3" />
                QUEST
              </Badge>
            )}

            {/* Category Badge */}
            {taskCategory && (
              <CategoryBadge type="category" value={taskCategory} size="sm" />
            )}

            {/* Effort Badge */}
            <EffortBadge effort={taskEffort} size="sm" />

            {/* Status Indicator */}
            {isPending && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Circle className="h-3 w-3" />
                Pending
              </Badge>
            )}
            {isInProgress && (
              <Badge variant="outline" className="gap-1 text-xs text-primary">
                <PlayCircle className="h-3 w-3" />
                In Progress
              </Badge>
            )}
            {isCompleted && (
              <Badge variant="outline" className="gap-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                Completed
              </Badge>
            )}

            {/* XP Reward */}
            <Badge variant="outline" className="gap-1 text-xs font-bold ml-auto">
              +{task.xp_reward || 10} XP
            </Badge>
          </div>

          {/* Title */}
          <h3
            className={`font-bold text-base mb-1 ${
              isCompleted ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            {task.title}
          </h3>

          {/* Description */}
          {task.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{task.description}</p>}

          {/* Reason/Why (collapsible) */}
          {taskReason && (
            <Collapsible open={isReasonOpen} onOpenChange={setIsReasonOpen} className="mb-3">
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Lightbulb className="h-3 w-3" />
                <span>Why this task?</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${isReasonOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="p-2.5 bg-muted/50 rounded-md text-xs text-muted-foreground">
                  {taskReason}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Footer: Timestamp and Actions */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Timestamp */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {needsWorkspace && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenWorkspace}
                  disabled={isWorkspaceProcessing}
                  className="h-8 text-xs gap-1"
                >
                  <FileText className="h-3 w-3" />
                  {isWorkspaceProcessing ? "Opening..." : "Open in Workspace"}
                </Button>
              )}
              {isPending && onStart && (
                <Button size="sm" variant="outline" onClick={handleStartClick} className="h-8 text-xs">
                  Start
                </Button>
              )}
              {!isCompleted && (
                <Button size="sm" onClick={() => onComplete(task.id)} disabled={isCompleting} className="h-8 text-xs">
                  {isCompleting ? "Completing..." : "Mark Complete"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
