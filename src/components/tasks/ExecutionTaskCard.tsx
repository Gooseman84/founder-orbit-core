import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { supabase } from "@/integrations/supabase/client";
import { recordXpEvent } from "@/lib/xpEngine";
import { toast } from "sonner";
import type { DailyTask } from "@/hooks/useDailyExecution";

interface ExecutionTaskCardProps {
  task: DailyTask;
  ventureId?: string;
  onToggle: (completed: boolean) => void;
  disabled?: boolean;
}

export function ExecutionTaskCard({ task, ventureId, onToggle, disabled }: ExecutionTaskCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh: refreshXp } = useXP();
  const [isWorkspaceProcessing, setIsWorkspaceProcessing] = useState(false);

  const categoryColors: Record<string, string> = {
    validation: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    build: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    marketing: "bg-green-500/10 text-green-500 border-green-500/30",
    ops: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  };

  const handleOpenWorkspace = async () => {
    if (!user || isWorkspaceProcessing) return;
    setIsWorkspaceProcessing(true);

    try {
      // Check for existing document linked to this task
      const { data: existingDoc } = await supabase
        .from("workspace_documents")
        .select("id")
        .eq("user_id", user.id)
        .eq("source_type", "execution_task")
        .eq("source_id", task.id)
        .maybeSingle();

      if (existingDoc) {
        await recordXpEvent(user.id, "workspace_opened", 10, {
          source: "execution_task",
          taskId: task.id,
        });
        refreshXp();
        toast.success(`Workspace ready for: ${task.title}`);
        navigate(`/workspace/${existingDoc.id}`);
        return;
      }

      // Create new document for this task
      // Note: Don't use linked_task_id here - execution tasks are stored in venture_daily_tasks (JSONB),
      // not in the tasks table, so the foreign key constraint would fail
      const { data: newDoc, error } = await supabase
        .from("workspace_documents")
        .insert({
          user_id: user.id,
          venture_id: ventureId || null,
          source_type: "execution_task",
          source_id: task.id,
          doc_type: "task-work",
          title: task.title,
          content: `## ${task.title}\n\n**Category:** ${task.category}\n**Estimated Time:** ${task.estimatedMinutes} minutes\n\n### Description\n${task.description}\n\n### Notes\n\n`,
          status: "draft",
          metadata: { taskId: task.id },
        })
        .select()
        .single();

      if (error) throw error;

      await recordXpEvent(user.id, "workspace_opened", 10, {
        source: "execution_task",
        taskId: task.id,
      });
      refreshXp();
      toast.success(`Workspace ready for: ${task.title}`);
      navigate(`/workspace/${newDoc.id}`);
    } catch (error) {
      console.error("Error opening workspace:", error);
      toast.error("Failed to open workspace");
    } finally {
      setIsWorkspaceProcessing(false);
    }
  };

  return (
    <Card className={cn(
      "transition-all",
      task.completed && "opacity-60"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Checkbox
            id={task.id}
            checked={task.completed}
            onCheckedChange={(checked) => onToggle(!!checked)}
            disabled={disabled}
            className="mt-1"
          />
          <div className="flex-1 space-y-2 min-w-0">
            <label
              htmlFor={task.id}
              className={cn(
                "font-medium cursor-pointer block",
                task.completed && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </label>
            <p className="text-sm text-muted-foreground">{task.description}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge 
                variant="outline" 
                className={cn("text-xs", categoryColors[task.category] || "")}
              >
                {task.category}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {task.estimatedMinutes} min
              </span>
              
              {/* Work on This button */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenWorkspace}
                disabled={isWorkspaceProcessing}
                className="h-7 text-xs gap-1 ml-auto"
              >
                {isWorkspaceProcessing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <FileText className="h-3 w-3" />
                )}
                Work on This
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
