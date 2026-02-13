import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { supabase } from "@/integrations/supabase/client";
import { recordXpEvent } from "@/lib/xpEngine";
import { getTaskPromptDefaults } from "@/lib/taskPromptDefaults";
import { toast } from "sonner";
import type { DailyTask } from "@/hooks/useDailyExecution";

interface ExecutionTaskCardProps {
  task: DailyTask;
  ventureId?: string;
  ventureName?: string;
  onToggle: (completed: boolean) => void;
  disabled?: boolean;
}

export function ExecutionTaskCard({ task, ventureId, ventureName, onToggle, disabled }: ExecutionTaskCardProps) {
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
      // Generate AI prompt from task metadata or defaults
      const ventureContext = {
        ventureName: ventureName || "my venture",
      };
      const defaults = getTaskPromptDefaults(task.title, task.description, ventureContext);
      const aiPrompt = task.ai_prompt || defaults.aiPrompt;
      const linkedSection = task.linked_section ?? defaults.linkedSection;

      // Check for existing document linked to this task
      const { data: existingDoc } = await supabase
        .from("workspace_documents")
        .select("id")
        .eq("user_id", user.id)
        .eq("source_type", "execution_task")
        .eq("source_id", task.id)
        .maybeSingle();

      let targetDocId: string;

      if (existingDoc) {
        targetDocId = existingDoc.id;
      } else {
        // Create new document for this task
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
        targetDocId = newDoc.id;
      }

      await recordXpEvent(user.id, "workspace_opened", 10, {
        source: "execution_task",
        taskId: task.id,
      });
      refreshXp();

      toast.success(`Opening workspace for: ${task.title}`);

      // Navigate with deep-link state for AI panel + task completion
      navigate(`/workspace/${targetDocId}`, {
        state: {
          executionTask: {
            id: task.id,
            title: task.title,
            description: task.description,
            category: task.category,
            estimatedMinutes: task.estimatedMinutes,
            completed: task.completed,
            aiPrompt,
            linkedSection,
            ventureId,
          },
        },
      });
    } catch (error) {
      console.error("Error opening workspace:", error);
      toast.error("Failed to open workspace");
    } finally {
      setIsWorkspaceProcessing(false);
    }
  };

  // Check if a workspace document already exists for this task
  const [hasDoc, setHasDoc] = useState<boolean | null>(null);
  // Lazy check on first render
  useState(() => {
    if (!user) return;
    supabase
      .from("workspace_documents")
      .select("id")
      .eq("user_id", user.id)
      .eq("source_type", "execution_task")
      .eq("source_id", task.id)
      .maybeSingle()
      .then(({ data }) => setHasDoc(!!data));
  });

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
              
              {/* Work on This / Revisit button */}
              <Button
                size="sm"
                variant={task.completed ? "outline" : "default"}
                onClick={handleOpenWorkspace}
                disabled={isWorkspaceProcessing}
                className="h-7 text-xs gap-1 ml-auto"
              >
                {isWorkspaceProcessing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    {hasDoc && !task.completed && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                    {task.completed ? "Revisit" : "Work on This"}
                    <ArrowRight className="h-3 w-3" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
