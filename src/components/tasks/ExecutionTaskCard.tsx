import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyTask } from "@/hooks/useDailyExecution";

interface ExecutionTaskCardProps {
  task: DailyTask;
  onToggle: (completed: boolean) => void;
  disabled?: boolean;
}

export function ExecutionTaskCard({ task, onToggle, disabled }: ExecutionTaskCardProps) {
  const categoryColors: Record<string, string> = {
    validation: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    build: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    marketing: "bg-green-500/10 text-green-500 border-green-500/30",
    ops: "bg-orange-500/10 text-orange-500 border-orange-500/30",
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
          <div className="flex-1 space-y-2">
            <label
              htmlFor={task.id}
              className={cn(
                "font-medium cursor-pointer",
                task.completed && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </label>
            <p className="text-sm text-muted-foreground">{task.description}</p>
            <div className="flex items-center gap-3">
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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
