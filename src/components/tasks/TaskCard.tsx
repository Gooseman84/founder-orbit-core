import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Zap, 
  Target, 
  Clock, 
  CheckCircle2, 
  Circle,
  PlayCircle 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
}

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onStart?: (taskId: string) => void;
  isCompleting?: boolean;
}

export function TaskCard({ task, onComplete, onStart, isCompleting = false }: TaskCardProps) {
  const isMicro = task.type === "micro";
  const isQuest = task.type === "quest";
  const isPending = task.status === "pending";
  const isInProgress = task.status === "in_progress";
  const isCompleted = task.status === "completed";

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

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
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
          {/* Header: Type badge and status */}
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
              <Badge variant="outline" className="gap-1 text-xs text-green-600">
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
              isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
            }`}
          >
            {task.title}
          </h3>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {task.description}
            </p>
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
              {isPending && onStart && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartClick}
                  className="h-8 text-xs"
                >
                  Start
                </Button>
              )}
              {!isCompleted && (
                <Button
                  size="sm"
                  onClick={() => onComplete(task.id)}
                  disabled={isCompleting}
                  className="h-8 text-xs"
                >
                  {isCompleting ? 'Completing...' : 'Mark Complete'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
